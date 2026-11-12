import { eq, or, sql } from 'drizzle-orm'
import type { Account } from '../domain/Account'
import type { MicrosoftIdentity } from '../domain/MicrosoftIdentity'
import type { UserRepository } from '../domain/UserRepository'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import type { Database } from '../../../platform/database/client'
import { users } from '../../../platform/database/schema'

export class MySqlUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async upsert(identity: MicrosoftIdentity, ip: string | null): Promise<Account> {
    const profile = {
      email: identity.email,
      microsoftSubject: identity.subject,
      name: identity.name,
      avatar: null,
      lastLoginIp: ip,
      lastLoginAt: new Date()
    }

    return this.db.transaction(async (transaction) => {
      // Acquire the unique identity/email row without changing an existing identity.
      await transaction.insert(users).values(profile)
        .onDuplicateKeyUpdate({ set: { id: sql`${users.id}` } })

      const matches = await transaction.select().from(users)
        .where(or(eq(users.microsoftSubject, identity.subject), eq(users.email, identity.email)))
        .limit(2)
        .for('update')
      const account = matches[0]

      if (matches.length !== 1 || !account || account.microsoftSubject !== identity.subject) {
        throw new ApplicationError('unauthenticated', 'Email is linked to a different Microsoft identity')
      }

      await transaction.update(users).set({ ...profile, updatedAt: new Date() })
        .where(eq(users.id, account.id))
      const [updated] = await transaction.select().from(users).where(eq(users.id, account.id)).limit(1)

      if (!updated) {
        throw new Error('Unable to persist user')
      }
      return updated
    })
  }
}
