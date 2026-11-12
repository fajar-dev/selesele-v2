import * as oidc from 'openid-client'
import * as z from 'zod'
import type { IdentityProvider } from '../domain/IdentityProvider'
import type { MicrosoftIdentity } from '../domain/MicrosoftIdentity'
import type { OAuthTransaction } from '../domain/OAuthTransaction'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export interface MicrosoftAuthConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  origin: string
}

const claimsSchema = z.object({
  oid: z.uuid(),
  tid: z.uuid(),
  email: z.email().optional(),
  preferred_username: z.string().optional(),
  name: z.string().max(255).optional()
})

export class MicrosoftIdentityProvider implements IdentityProvider {
  private configuration?: Promise<oidc.Configuration>

  constructor(private readonly config: MicrosoftAuthConfig, private readonly fetcher?: oidc.CustomFetch) {}

  private redirectUri() {
    const origin = new URL(this.config.origin)
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
      || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) {
      throw new ApplicationError('unavailable', 'APP_ORIGIN must be an HTTPS origin (HTTP is allowed on localhost)')
    }
    return new URL('/api/auth/microsoft/callback', origin).href
  }

  private async configurationForTenant() {
    if (!z.uuid().safeParse(this.config.tenantId).success || !z.uuid().safeParse(this.config.clientId).success || !this.config.clientSecret || !this.config.origin) {
      throw new ApplicationError('unavailable', 'Microsoft authentication is not configured')
    }
    this.redirectUri()
    if (!this.configuration) {
      this.configuration = oidc.discovery(
        new URL(`https://login.microsoftonline.com/${this.config.tenantId}/v2.0`),
        this.config.clientId,
        this.config.clientSecret,
        oidc.ClientSecretPost(this.config.clientSecret),
        { execute: [oidc.enableNonRepudiationChecks], timeout: 10, [oidc.customFetch]: this.fetcher }
      ).catch((error: unknown) => {
        this.configuration = undefined
        throw error
      })
    }
    return this.configuration
  }

  async authorizationUrl(transaction: OAuthTransaction): Promise<string> {
    const configuration = await this.configurationForTenant()
    return oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: this.redirectUri(),
      scope: 'openid profile email',
      response_mode: 'query',
      state: transaction.state,
      nonce: transaction.nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(transaction.verifier),
      code_challenge_method: 'S256'
    }).href
  }

  async verify(callback: URL, transaction: OAuthTransaction): Promise<MicrosoftIdentity> {
    const configuration = await this.configurationForTenant()
    try {
      const expected = new URL(this.redirectUri())
      if (callback.origin !== expected.origin || callback.pathname !== expected.pathname) {
        throw new Error('Unexpected redirect URI')
      }
      const tokens = await oidc.authorizationCodeGrant(configuration, callback, {
        pkceCodeVerifier: transaction.verifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        idTokenExpected: true
      })
      const claims = claimsSchema.parse(tokens.claims())
      const email = claims.email || claims.preferred_username
      if (claims.tid.toLowerCase() !== this.config.tenantId.toLowerCase() || !z.email().safeParse(email).success) {
        throw new Error('Tenant or email is invalid')
      }
      return { subject: `${claims.tid.toLowerCase()}:${claims.oid.toLowerCase()}`, email: email!.trim().toLowerCase(), name: claims.name }
    } catch {
      throw new ApplicationError('unauthenticated', 'Microsoft identity could not be verified')
    }
  }
}
