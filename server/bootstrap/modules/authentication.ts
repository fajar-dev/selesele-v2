import { AuthService } from '../../features/authentication/application/AuthService'
import { MicrosoftIdentityProvider } from '../../features/authentication/infrastructure/MicrosoftIdentityProvider'
import { OAuthService } from '../../features/authentication/application/OAuthService'
import { MySqlSessionRepository } from '../../features/authentication/infrastructure/MySqlSessionRepository'
import { MySqlUserRepository } from '../../features/authentication/infrastructure/MySqlUserRepository'
import type { RuntimeModule } from './runtime'

export function createAuthenticationModule(runtime: RuntimeModule) {
  const { database, tokens, clock } = runtime
  const auth = new AuthService(new MySqlUserRepository(database.db), new MySqlSessionRepository(database.db), tokens, clock)
  const oauth = new OAuthService(new MicrosoftIdentityProvider({ clientId: process.env.MICROSOFT_CLIENT_ID || '', clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '', tenantId: process.env.MICROSOFT_TENANT_ID || '', origin: process.env.APP_ORIGIN || '' }), auth, tokens, clock)
  return { auth, oauth }
}
export type AuthenticationModule = ReturnType<typeof createAuthenticationModule>
