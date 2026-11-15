import type { CustomFetch } from 'openid-client'
import * as z from 'zod'
import type { ExternalIdentity } from '../domain/ExternalIdentity'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import { OpenIdIdentityProvider } from './OpenIdIdentityProvider'
import type { OpenIdAuthConfig } from './OpenIdIdentityProvider'

interface MicrosoftAuthConfig extends OpenIdAuthConfig { tenantId: string }
const claimsSchema = z.object({
  oid: z.uuid(), tid: z.uuid(), email: z.email().optional(),
  preferred_username: z.string().optional(), name: z.string().max(255).optional()
})

export class MicrosoftIdentityProvider extends OpenIdIdentityProvider {
  constructor(private readonly microsoft: MicrosoftAuthConfig, fetcher?: CustomFetch) {
    super('microsoft', microsoft, `https://login.microsoftonline.com/${microsoft.tenantId}/v2.0`, fetcher)
  }

  protected validateConfiguration() {
    if (!z.uuid().safeParse(this.microsoft.tenantId).success || !z.uuid().safeParse(this.microsoft.clientId).success) {
      throw new ApplicationError('unavailable', 'Microsoft authentication requires a single tenant and client ID')
    }
  }

  protected identity(input: unknown): ExternalIdentity {
    const claims = claimsSchema.parse(input)
    const email = claims.email || claims.preferred_username
    if (claims.tid.toLowerCase() !== this.microsoft.tenantId.toLowerCase() || !z.email().safeParse(email).success) {
      throw new Error('Tenant or email is invalid')
    }
    return { provider: 'microsoft', subject: `${claims.tid.toLowerCase()}:${claims.oid.toLowerCase()}`, email: email!.trim().toLowerCase(), name: claims.name }
  }
}
