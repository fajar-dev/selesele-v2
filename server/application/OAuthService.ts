import { randomBytes } from 'node:crypto'
import type { IdentityProvider } from '../domain/ports/IdentityProvider'
import type { OAuthTransaction } from '../domain/entities/OAuthTransaction'
import { ApplicationError } from '../domain/errors/ApplicationError'
import type { AuthService } from './AuthService'

export const OAUTH_TTL_SECONDS = 600

export class OAuthService {
  constructor(private readonly identities: IdentityProvider, private readonly auth: AuthService) {}

  async begin() {
    const transaction: OAuthTransaction = {
      state: randomBytes(32).toString('base64url'),
      nonce: randomBytes(32).toString('base64url'),
      verifier: randomBytes(32).toString('base64url'),
      createdAt: Date.now()
    }
    const url = await this.identities.authorizationUrl(transaction)
    return { transaction, url }
  }

  async complete(callback: URL, transaction: OAuthTransaction | undefined, ip: string | null) {
    const states = callback.searchParams.getAll('state')
    if (!transaction || !transaction.state || states.length !== 1 || states[0] !== transaction.state
      || !Number.isFinite(transaction.createdAt) || transaction.createdAt > Date.now()
      || Date.now() - transaction.createdAt >= OAUTH_TTL_SECONDS * 1000) {
      throw new ApplicationError(400, 'Microsoft sign-in expired or invalid. Please try again.')
    }
    if (callback.searchParams.has('error')) {
      throw new ApplicationError(401, 'Microsoft sign-in was cancelled or denied.')
    }
    const codes = callback.searchParams.getAll('code')
    if (codes.length !== 1 || !codes[0] || codes[0].length > 8192) {
      throw new ApplicationError(400, 'Invalid Microsoft authorization response')
    }
    return this.auth.login(await this.identities.verify(callback, transaction), ip)
  }
}
