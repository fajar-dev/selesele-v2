import { index, int, json, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import type { EmailActivity } from '../../../features/mail/domain/EmailActivity'
import { uuidv7 } from 'uuidv7'
import { workspaces, workspaceMembers } from './workspaces'
import { items } from './items'
import { users } from './identity'
import type { NotificationItem } from '../../../../shared/kernel/notification'

export const emailDeliveries = mysqlTable('email_deliveries', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  deduplicationKey: varchar('deduplication_key', { length: 180 }).notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  recipientUserId: varchar('recipient_user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 36 }).references(() => items.id, { onDelete: 'cascade' }),
  memberId: varchar('member_id', { length: 36 }).references(() => workspaceMembers.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 20 }).notNull().$type<NotificationItem['kind']>(),
  title: varchar('title', { length: 320 }).notNull(),
  activity: json('activity').$type<EmailActivity>(),
  deliveryMode: varchar('delivery_mode', { length: 12 }).notNull().default('immediate').$type<'immediate' | 'daily'>(),
  state: varchar('state', { length: 16 }).notNull().default('pending').$type<'pending' | 'processing' | 'sent' | 'failed' | 'skipped'>(),
  attempts: int('attempts').notNull().default(0),
  availableAt: timestamp('available_at', { fsp: 3 }).notNull().defaultNow(),
  leaseUntil: timestamp('lease_until', { fsp: 3 }),
  leaseToken: varchar('lease_token', { length: 36 }),
  completedAt: timestamp('completed_at', { fsp: 3 }),
  lastError: varchar('last_error', { length: 80 }),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [uniqueIndex('email_deliveries_dedup').on(table.deduplicationKey), index('email_deliveries_pending').on(table.state, table.availableAt), index('email_deliveries_lease').on(table.state, table.leaseUntil)])
