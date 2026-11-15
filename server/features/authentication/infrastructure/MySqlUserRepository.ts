import { and, eq, or, sql, isNull, inArray } from 'drizzle-orm'
import type { Account } from '../domain/Account'
import type { MicrosoftIdentity } from '../domain/MicrosoftIdentity'
import type { UserRepository } from '../domain/UserRepository'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import type { Database } from '../../../platform/database/client'
import { users, workspaceMembers, notifications, workspaces } from '../../../platform/database/schema'

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
      const memberships = await transaction.select({ id: workspaceMembers.id, workspaceId: workspaceMembers.workspaceId, suspendedAt: workspaceMembers.suspendedAt, name: workspaces.name }).from(workspaceMembers).innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(and(eq(workspaceMembers.email, identity.email), isNull(workspaceMembers.userId), isNull(workspaces.deletedAt))).for('update')
      if (memberships.length) {
        await transaction.update(workspaceMembers).set({ userId: updated.id }).where(inArray(workspaceMembers.id, memberships.map(member => member.id)))
        const active = memberships.filter(member => !member.suspendedAt)
        if (active.length) {
          await transaction.insert(notifications).values(active.map(member => ({ userId: updated.id, workspaceId: member.workspaceId, kind: 'invitation' as const, title: `You have access to ${member.name}`, deduplicationKey: `member:${member.id}` }))).onDuplicateKeyUpdate({ set: { userId: updated.id } })
        }
      }
      return updated
    }, { isolationLevel: 'read committed' })
  }
}
