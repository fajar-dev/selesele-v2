import { createHash, randomBytes } from 'node:crypto'
import type { MicrosoftIdentity } from '../domain/entities/MicrosoftIdentity'
import type { SessionRepository } from '../domain/ports/SessionRepository'
import type { UserRepository } from '../domain/ports/UserRepository'
import type { User } from '../../shared/types/auth'
import { ApplicationError } from '../domain/errors/ApplicationError'

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository
  ) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private publicUser(user: User): User {
    return { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
  }

  async login(identity: MicrosoftIdentity, ip: string | null) {
    const user = await this.users.upsert(identity, ip)
    if (!user.isActive) {
      throw new ApplicationError(403, 'Account is inactive')
    }
    const token = randomBytes(32).toString('base64url')
    await this.sessions.create(this.hash(token), user.id, new Date(Date.now() + SESSION_TTL_SECONDS * 1000))
    return { user: this.publicUser(user), token }
  }

  async authenticate(token?: string) {
    if (!token || !/^[\w-]{43}$/.test(token)) {
      throw new ApplicationError(401, 'Authentication required')
    }
    const session = await this.sessions.find(this.hash(token))
    if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      throw new ApplicationError(401, 'Session expired or revoked')
    }
    return this.publicUser(session.user)
  }

  async refresh(token?: string) {
    const user = await this.authenticate(token)
    const next = randomBytes(32).toString('base64url')
    const rotated = await this.sessions.rotate(this.hash(token!), this.hash(next), new Date(Date.now() + SESSION_TTL_SECONDS * 1000))
    if (!rotated) {
      throw new ApplicationError(401, 'Session already rotated')
    }
    return { user, token: next }
  }

  async logout(token?: string) {
    if (token) {
      await this.sessions.delete(this.hash(token))
    }
  }
}
