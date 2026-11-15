import type { AuthProvider } from '../../../shared/model/authentication'
import type { IdentityProvider } from '../../features/authentication/domain/IdentityProvider'
import { GoogleIdentityProvider } from '../../features/authentication/infrastructure/GoogleIdentityProvider'
import { AuthService } from '../../features/authentication/application/AuthService'
import { MicrosoftIdentityProvider } from '../../features/authentication/infrastructure/MicrosoftIdentityProvider'
import { OAuthService } from '../../features/authentication/application/OAuthService'
import { MySqlSessionRepository } from '../../features/authentication/infrastructure/MySqlSessionRepository'
import { MySqlUserRepository } from '../../features/authentication/infrastructure/MySqlUserRepository'
import type { RuntimeModule } from './runtime'

export function createAuthenticationModule(runtime: RuntimeModule) {
  const { database, tokens, clock } = runtime
  const auth = new AuthService(new MySqlUserRepository(database.db), new MySqlSessionRepository(database.db), tokens, clock)
  const providers: Partial<Record<AuthProvider, IdentityProvider>> = {}
  const origin = process.env.APP_ORIGIN || ''
  if (process.env.MICROSOFT_ENABLED !== 'false') {
    providers.microsoft = new MicrosoftIdentityProvider({ clientId: process.env.MICROSOFT_CLIENT_ID || '', clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '', tenantId: process.env.MICROSOFT_TENANT_ID || '', origin })
  }
  if (process.env.GOOGLE_ENABLED === 'true') {
    providers.google = new GoogleIdentityProvider({ clientId: process.env.GOOGLE_CLIENT_ID || '', clientSecret: process.env.GOOGLE_CLIENT_SECRET || '', origin })
  }
  const oauth = new OAuthService(providers, auth, tokens, clock)
  return { auth, oauth }
}
export type AuthenticationModule = ReturnType<typeof createAuthenticationModule>
