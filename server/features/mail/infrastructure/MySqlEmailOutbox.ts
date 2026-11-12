import { and, eq, gt, gte, isNull, lt, lte, or } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Database } from '../../../platform/database/client'
import { emailDeliveries, folders, pages, users, workspaceInvitations, workspaceMembers, workspaces } from '../../../platform/database/schema'
import type { EmailDelivery } from '../domain/EmailDelivery'
import type { EmailOutbox } from '../domain/EmailOutbox'
import { deliveryPolicy } from '../domain/deliveryPolicy'

export class MySqlEmailOutbox implements EmailOutbox {
  constructor(private readonly db: Database) {}

  async claim(now: Date): Promise<EmailDelivery | null> {
    await this.db.update(emailDeliveries).set({ state: 'failed', lastError: 'lease_exhausted', leaseUntil: null, leaseToken: null })
      .where(and(eq(emailDeliveries.state, 'processing'), lte(emailDeliveries.leaseUntil, now), gte(emailDeliveries.attempts, deliveryPolicy.maxAttempts)))
    return this.db.transaction(async (transaction) => {
      const [row] = await transaction.select().from(emailDeliveries).where(and(lt(emailDeliveries.attempts, deliveryPolicy.maxAttempts), or(
        and(eq(emailDeliveries.state, 'pending'), lte(emailDeliveries.availableAt, now)),
        and(eq(emailDeliveries.state, 'processing'), lte(emailDeliveries.leaseUntil, now))
      ))).orderBy(emailDeliveries.availableAt, emailDeliveries.id).limit(1).for('update', { skipLocked: true })
      if (!row) {
        return null
      }
      const leaseToken = uuidv7()
      const attempts = row.attempts + 1
      await transaction.update(emailDeliveries).set({ state: 'processing', leaseToken, attempts, leaseUntil: new Date(now.getTime() + deliveryPolicy.leaseMs) }).where(eq(emailDeliveries.id, row.id))
      return { ...row, attempts, leaseToken }
    }, { isolationLevel: 'read committed' })
  }

  async deliverable(delivery: EmailDelivery, now: Date): Promise<boolean> {
    if (delivery.kind === 'invitation') {
      if (!delivery.invitationId || !delivery.invitationExpiresAt) {
        return false
      }
      const [invitation] = await this.db.select({ id: workspaceInvitations.id }).from(workspaceInvitations)
        .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
        .where(and(eq(workspaceInvitations.id, delivery.invitationId), eq(workspaceInvitations.workspaceId, delivery.workspaceId), eq(workspaceInvitations.email, delivery.recipient),
          eq(workspaceInvitations.expiresAt, delivery.invitationExpiresAt), gt(workspaceInvitations.expiresAt, now), isNull(workspaces.deletedAt))).limit(1)
      return !!invitation
    }
    if (!delivery.pageId || !delivery.recipientUserId) {
      return false
    }
    const [page] = await this.db.select({ id: pages.id }).from(pages)
      .innerJoin(workspaces, eq(workspaces.id, pages.workspaceId))
      .innerJoin(workspaceMembers, and(eq(workspaceMembers.workspaceId, workspaces.id), eq(workspaceMembers.userId, delivery.recipientUserId)))
      .innerJoin(users, eq(users.id, workspaceMembers.userId)).leftJoin(folders, eq(folders.id, pages.folderId))
      .where(and(eq(pages.id, delivery.pageId), eq(pages.workspaceId, delivery.workspaceId), eq(users.email, delivery.recipient), isNull(workspaces.deletedAt), isNull(pages.deletedAt), isNull(folders.deletedAt))).limit(1)
    return !!page
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
