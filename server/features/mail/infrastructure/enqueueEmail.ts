import { and, eq, sql } from 'drizzle-orm'
import type { DatabaseTransaction } from '../../../platform/database/client'
import { defaultNotificationPreferences } from '../../../../shared/kernel/workspaceSettings'
import { nextDigestAt } from '../domain/digestSchedule'
import { emailDeliveries, users, workspaceMembers } from '../../../platform/database/schema'

type PendingEmail = Pick<typeof emailDeliveries.$inferInsert, 'deduplicationKey' | 'recipient' | 'recipientUserId' | 'workspaceId' | 'pageId' | 'memberId' | 'kind' | 'title' | 'activity'>

/** Persist with the notification, never perform network delivery in this transaction. */
export async function enqueueEmail(transaction: DatabaseTransaction, message: PendingEmail): Promise<void> {
  let deliveryMode: 'immediate' | 'daily' = 'immediate'
  if (message.recipientUserId) {
    const [user] = await transaction.select({ enabled: users.invitationEmail }).from(users).where(eq(users.id, message.recipientUserId))
    if (message.kind === 'invitation' && !user?.enabled) {
      return
    }
    const [member] = await transaction.select({ preferences: workspaceMembers.notifications }).from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, message.workspaceId), eq(workspaceMembers.userId, message.recipientUserId)))
    const preferences = member?.preferences ?? defaultNotificationPreferences()
    if (!preferences.email[message.kind]) {
      return
    }
    if (message.kind !== 'invitation') {
      deliveryMode = preferences.delivery
    }
  }
  await transaction.insert(emailDeliveries).values({ ...message, deliveryMode, availableAt: deliveryMode === 'daily' ? nextDigestAt(new Date()) : new Date() }).onDuplicateKeyUpdate({ set: { deduplicationKey: sql`${emailDeliveries.deduplicationKey}` } })
}
