import * as oidc from 'openid-client'
import type { AuthProvider } from '../../../../shared/model/authentication'
import type { IdentityProvider } from '../domain/IdentityProvider'
import type { ExternalIdentity } from '../domain/ExternalIdentity'
import type { OAuthTransaction } from '../domain/OAuthTransaction'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export interface OpenIdAuthConfig {
  clientId: string
  clientSecret: string
  origin: string
}

/** Shared authorization-code flow with PKCE, state, nonce and signed ID-token verification. */
export abstract class OpenIdIdentityProvider implements IdentityProvider {
  private configuration?: Promise<oidc.Configuration>
  constructor(private readonly provider: AuthProvider, protected readonly config: OpenIdAuthConfig, private readonly issuer: string, private readonly fetcher?: oidc.CustomFetch) {}

  protected abstract validateConfiguration(): void
  protected abstract identity(claims: unknown): ExternalIdentity

  private redirectUri() {
    const origin = new URL(this.config.origin)
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
      || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) {
      throw new ApplicationError('unavailable', 'APP_ORIGIN must be an HTTPS origin (HTTP is allowed on localhost)')
    }
    return new URL(`/api/auth/${this.provider}/callback`, origin).href
  }

  private async discover() {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.origin) {
      throw new ApplicationError('unavailable', `${this.provider} authentication is not configured`)
    }
    this.validateConfiguration()
    this.redirectUri()
    return this.configuration ??= oidc.discovery(new URL(this.issuer), this.config.clientId, this.config.clientSecret,
      oidc.ClientSecretPost(this.config.clientSecret),
      { execute: [oidc.enableNonRepudiationChecks], timeout: 10, [oidc.customFetch]: this.fetcher }
    ).catch((error: unknown) => {
      this.configuration = undefined
      throw error
    })
  }

  async authorizationUrl(transaction: OAuthTransaction): Promise<string> {
    return oidc.buildAuthorizationUrl(await this.discover(), {
      redirect_uri: this.redirectUri(), scope: 'openid profile email', response_mode: 'query',
      state: transaction.state, nonce: transaction.nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(transaction.verifier), code_challenge_method: 'S256'
    }).href
  }

  async verify(callback: URL, transaction: OAuthTransaction): Promise<ExternalIdentity> {
    const configuration = await this.discover()
    try {
      const expected = new URL(this.redirectUri())
      if (callback.origin !== expected.origin || callback.pathname !== expected.pathname) {
        throw new Error('Unexpected redirect URI')
      }
      const tokens = await oidc.authorizationCodeGrant(configuration, callback, {
        pkceCodeVerifier: transaction.verifier, expectedState: transaction.state,
        expectedNonce: transaction.nonce, idTokenExpected: true
      })
      return this.identity(tokens.claims())
    } catch {
      throw new ApplicationError('unauthenticated', `${this.provider} identity could not be verified`)
    }
  }
}
