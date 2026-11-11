import { and, eq, gt, lt } from 'drizzle-orm'
import type { SessionRepository } from '../../../domain/ports/SessionRepository'
import type { Database } from '../client'
import { sessions, users } from '../schema'

export class MySqlSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  async create(tokenHash: string, userId: string, expiresAt: Date) {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
    await this.db.insert(sessions).values({ tokenHash, userId, expiresAt })
  }

  async find(hash: string) {
    const [row] = await this.db.select({ user: users, expiresAt: sessions.expiresAt })
      .from(sessions).innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.tokenHash, hash)).limit(1)
    return row || null
  }

  async delete(hash: string) {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, hash))
  }

  async rotate(oldHash: string, newHash: string, expiresAt: Date) {
    const [result] = await this.db.update(sessions).set({ tokenHash: newHash, expiresAt })
      .where(and(eq(sessions.tokenHash, oldHash), gt(sessions.expiresAt, new Date())))
    return result.affectedRows === 1
  }
}
