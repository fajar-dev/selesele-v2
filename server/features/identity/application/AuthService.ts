import { SESSION_TTL_SECONDS } from '../domain/SessionPolicy'
import type { Clock } from '../../../core/ports/Clock'
import type { TokenGenerator } from '../domain/TokenGenerator'
import type { MicrosoftIdentity } from '../domain/MicrosoftIdentity'
import type { SessionRepository } from '../domain/SessionRepository'
import type { UserRepository } from '../domain/UserRepository'
import type { User } from '../../../../shared/contracts/auth'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenGenerator,
    private readonly clock: Clock
  ) {}

  private publicUser(user: User): User {
    return { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
  }

  async login(identity: MicrosoftIdentity, ip: string | null) {
    const user = await this.users.upsert(identity, ip)
    if (!user.isActive) {
      throw new ApplicationError('forbidden', 'Account is inactive')
    }
    const token = this.tokens.generate()
    await this.sessions.create(this.tokens.digest(token), user.id, new Date(this.clock.now().getTime() + SESSION_TTL_SECONDS * 1000))
    return { user: this.publicUser(user), token }
  }

  async authenticate(token?: string) {
    if (!token || !/^[\w-]{43}$/.test(token)) {
      throw new ApplicationError('unauthenticated', 'Authentication required')
    }
    const session = await this.sessions.find(this.tokens.digest(token))
    if (!session || session.expiresAt.getTime() <= this.clock.now().getTime() || !session.user.isActive) {
      throw new ApplicationError('unauthenticated', 'Session expired or revoked')
    }
    return this.publicUser(session.user)
  }

  async refresh(token?: string) {
    const user = await this.authenticate(token)
    const next = this.tokens.generate()
    const rotated = await this.sessions.rotate(this.tokens.digest(token!), this.tokens.digest(next), new Date(this.clock.now().getTime() + SESSION_TTL_SECONDS * 1000))
    if (!rotated) {
      throw new ApplicationError('unauthenticated', 'Session already rotated')
    }
    return { user, token: next }
  }

  async logout(token?: string) {
    if (token) {
      await this.sessions.delete(this.tokens.digest(token))
    }
  }
}
