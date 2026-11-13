import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { and, eq, gte, isNull, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Database } from '../../../platform/database/client'
import { emailDeliveries, users, workspaceMembers, workspaces } from '../../../platform/database/schema'
import type { EmailDelivery } from '../domain/EmailDelivery'
import type { EmailOutbox } from '../domain/EmailOutbox'
import { deliveryPolicy } from '../domain/deliveryPolicy'

export class MySqlEmailOutbox implements EmailOutbox {
  constructor(private readonly db: Database) {
  }

  async claim(now: Date): Promise<EmailDelivery | null> {
    await this.db.update(emailDeliveries).set({ state: 'failed', lastError: 'lease_exhausted', leaseUntil: null, leaseToken: null })
      .where(and(eq(emailDeliveries.state, 'processing'), lte(emailDeliveries.leaseUntil, now), gte(emailDeliveries.attempts, deliveryPolicy.maxAttempts)))
    return this.db.transaction(async (transaction) => {
      const [row] = await transaction.select().from(emailDeliveries).where(and(lt(emailDeliveries.attempts, deliveryPolicy.maxAttempts), or(and(eq(emailDeliveries.state, 'pending'), lte(emailDeliveries.availableAt, now)), and(eq(emailDeliveries.state, 'processing'), lte(emailDeliveries.leaseUntil, now))))).orderBy(emailDeliveries.availableAt, emailDeliveries.id).limit(1).for('update', { skipLocked: true })
      if (!row) {
        return null
      }
      const leaseToken = uuidv7()
      const attempts = row.attempts + 1
      const rows = row.deliveryMode === 'daily'
        ? await transaction.select().from(emailDeliveries).where(and(eq(emailDeliveries.workspaceId, row.workspaceId), eq(emailDeliveries.recipient, row.recipient), eq(emailDeliveries.deliveryMode, 'daily'), eq(emailDeliveries.state, 'pending'), lte(emailDeliveries.availableAt, now), lt(emailDeliveries.attempts, deliveryPolicy.maxAttempts))).orderBy(emailDeliveries.id).limit(50).for('update', { skipLocked: true })
        : [row]
      if (!rows.some(item => item.id === row.id)) {
        rows.push(row)
      }
      await transaction.update(emailDeliveries).set({ state: 'processing', leaseToken, attempts: sql`${emailDeliveries.attempts} + 1`, leaseUntil: new Date(now.getTime() + deliveryPolicy.leaseMs) }).where(inArray(emailDeliveries.id, rows.map(item => item.id)))
      const digest = rows.map(item => ({ ...item, attempts: item.attempts + 1, leaseToken }))
      return { ...row, attempts, leaseToken, digest: row.deliveryMode === 'daily' ? digest : undefined }
    }, { isolationLevel: 'read committed' })
  }

  async deliverable(delivery: EmailDelivery, _now: Date): Promise<boolean> {
    if (delivery.recipientUserId) {
      const [user] = await this.db.select({ enabled: users.invitationEmail }).from(users).where(eq(users.id, delivery.recipientUserId))
      const [member] = await this.db.select({ preferences: workspaceMembers.notifications }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, delivery.workspaceId), eq(workspaceMembers.userId, delivery.recipientUserId)))
      if (delivery.kind === 'invitation' ? !user?.enabled : member?.preferences?.email[delivery.kind] === false) {
        return false
      }
    }
    if (delivery.kind === 'invitation') {
      if (!delivery.memberId) {
        return false
      }
      const [member] = await this.db.select({ id: workspaceMembers.id }).from(workspaceMembers).innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(and(eq(workspaceMembers.id, delivery.memberId), eq(workspaceMembers.workspaceId, delivery.workspaceId), eq(workspaceMembers.email, delivery.recipient), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt))).limit(1)
      return !!member
    }
    if (!delivery.itemId || !delivery.recipientUserId) {
      return false
    }
    const [user] = await this.db.select({ email: users.email }).from(users).where(eq(users.id, delivery.recipientUserId))
    if (user?.email !== delivery.recipient) {
      return false
    }
    return (await loadResourceScope(this.db, delivery.recipientUserId, delivery.workspaceId)).allowed('item').includes(delivery.itemId)
  }

  async complete(delivery: EmailDelivery, state: 'sent' | 'skipped', now: Date) {
    await this.db.update(emailDeliveries).set({ state, completedAt: now, leaseUntil: null, leaseToken: null, lastError: null })
      .where(and(eq(emailDeliveries.id, delivery.id), eq(emailDeliveries.state, 'processing'), eq(emailDeliveries.leaseToken, delivery.leaseToken)))
  }

  async retry(delivery: EmailDelivery, availableAt: Date | null, errorCode: string) {
    await this.db.update(emailDeliveries).set({ state: availableAt ? 'pending' : 'failed', availableAt: availableAt ?? new Date(), leaseUntil: null, leaseToken: null, lastError: errorCode })
      .where(and(eq(emailDeliveries.id, delivery.id), eq(emailDeliveries.state, 'processing'), eq(emailDeliveries.leaseToken, delivery.leaseToken)))
  }
}
