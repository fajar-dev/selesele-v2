import { sql } from 'drizzle-orm'
import type { DatabaseTransaction } from '../../../platform/database/client'
import { emailDeliveries } from '../../../platform/database/schema'

type PendingEmail = Pick<typeof emailDeliveries.$inferInsert, 'deduplicationKey' | 'recipient' | 'recipientUserId' | 'workspaceId' | 'pageId' | 'invitationId' | 'invitationExpiresAt' | 'kind' | 'title' | 'activity'>

/** Persist with the notification, never perform network delivery in this transaction. */
export async function enqueueEmail(transaction: DatabaseTransaction, message: PendingEmail): Promise<void> {
  await transaction.insert(emailDeliveries).values(message).onDuplicateKeyUpdate({ set: { deduplicationKey: sql`${emailDeliveries.deduplicationKey}` } })
}
