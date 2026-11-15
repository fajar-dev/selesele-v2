import { OAUTH_TTL_SECONDS } from '../domain/OAuthPolicy'
import type { Clock } from '../../../core/ports/Clock'
import type { TokenGenerator } from '../domain/TokenGenerator'
import type { IdentityProvider } from '../domain/IdentityProvider'
import type { OAuthTransaction } from '../domain/OAuthTransaction'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import type { AuthService } from './AuthService'

export class OAuthService {
  constructor(private readonly identities: IdentityProvider, private readonly auth: AuthService, private readonly tokens: TokenGenerator, private readonly clock: Clock) {}

  async begin() {
    const transaction: OAuthTransaction = {
      state: this.tokens.generate(),
      nonce: this.tokens.generate(),
      verifier: this.tokens.generate(),
      createdAt: this.clock.now().getTime()
    }
    const url = await this.identities.authorizationUrl(transaction)
    return { transaction, url }
  }

  async complete(callback: URL, transaction: OAuthTransaction | undefined, ip: string | null) {
    const states = callback.searchParams.getAll('state')
    if (!transaction || !transaction.state || states.length !== 1 || states[0] !== transaction.state
      || !Number.isFinite(transaction.createdAt) || transaction.createdAt > this.clock.now().getTime()
      || this.clock.now().getTime() - transaction.createdAt >= OAUTH_TTL_SECONDS * 1000) {
      throw new ApplicationError('invalid_input', 'Microsoft sign-in expired or invalid. Please try again.')
    }
    if (callback.searchParams.has('error')) {
      throw new ApplicationError('unauthenticated', 'Microsoft sign-in was cancelled or denied.')
    }
    const codes = callback.searchParams.getAll('code')
    if (codes.length !== 1 || !codes[0] || codes[0].length > 8192) {
      throw new ApplicationError('invalid_input', 'Invalid Microsoft authorization response')
    }
    return this.auth.login(await this.identities.verify(callback, transaction), ip)
  }
}
