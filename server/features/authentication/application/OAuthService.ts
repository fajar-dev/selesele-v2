import type { AuthProvider } from '../../../../shared/model/authentication'
import { OAUTH_TTL_SECONDS } from '../domain/OAuthPolicy'
import type { Clock } from '../../../core/ports/Clock'
import type { TokenGenerator } from '../domain/TokenGenerator'
import type { IdentityProvider } from '../domain/IdentityProvider'
import type { OAuthTransaction } from '../domain/OAuthTransaction'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import type { AuthService } from './AuthService'

export class OAuthService {
  constructor(private readonly identities: Readonly<Partial<Record<AuthProvider, IdentityProvider>>>, private readonly auth: AuthService, private readonly tokens: TokenGenerator, private readonly clock: Clock) {}

  available(): AuthProvider[] {
    return Object.keys(this.identities) as AuthProvider[]
  }

  private identityProvider(provider: AuthProvider) {
    const identity = this.identities[provider]
    if (!identity) {
      throw new ApplicationError('unavailable', 'This sign-in provider is disabled')
    }
    return identity
  }

  async begin(provider: AuthProvider) {
    const transaction: OAuthTransaction = {
      state: this.tokens.generate(),
      nonce: this.tokens.generate(),
      verifier: this.tokens.generate(),
      createdAt: this.clock.now().getTime()
    }
    const url = await this.identityProvider(provider).authorizationUrl(transaction)
    return { transaction, url }
  }

  async complete(provider: AuthProvider, callback: URL, transaction: OAuthTransaction | undefined, ip: string | null) {
    const states = callback.searchParams.getAll('state')
    if (!transaction || !transaction.state || states.length !== 1 || states[0] !== transaction.state
      || !Number.isFinite(transaction.createdAt) || transaction.createdAt > this.clock.now().getTime()
      || this.clock.now().getTime() - transaction.createdAt >= OAUTH_TTL_SECONDS * 1000) {
      throw new ApplicationError('invalid_input', 'Sign-in expired or invalid. Please try again.')
    }
    if (callback.searchParams.has('error')) {
      throw new ApplicationError('unauthenticated', 'Sign-in was cancelled or denied.')
    }
    const codes = callback.searchParams.getAll('code')
    if (codes.length !== 1 || !codes[0] || codes[0].length > 8192) {
      throw new ApplicationError('invalid_input', 'Invalid authorization response')
    }
    return this.auth.login(await this.identityProvider(provider).verify(callback, transaction), ip)
  }
}
