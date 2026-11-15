import type { CustomFetch } from 'openid-client'
import * as z from 'zod'
import type { ExternalIdentity } from '../domain/ExternalIdentity'
import { OpenIdIdentityProvider } from './OpenIdIdentityProvider'
import type { OpenIdAuthConfig } from './OpenIdIdentityProvider'

const claimsSchema = z.object({
  sub: z.string().min(1).max(255), email: z.email(), email_verified: z.literal(true),
  name: z.string().max(255).optional()
})

export class GoogleIdentityProvider extends OpenIdIdentityProvider {
  constructor(config: OpenIdAuthConfig, fetcher?: CustomFetch) {
    super('google', config, 'https://accounts.google.com', fetcher)
  }

  protected validateConfiguration() {}

  protected identity(input: unknown): ExternalIdentity {
    const claims = claimsSchema.parse(input)
    return { provider: 'google', subject: claims.sub, email: claims.email.trim().toLowerCase(), name: claims.name }
  }
}
