import { mysqlTable, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { items } from './items'
import { users } from './authentication'
import { workspaces } from './workspaces'

export const notifications = mysqlTable('notifications', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 36 }).references(() => items.id, { onDelete: 'cascade' }),
  threadId: varchar('thread_id', { length: 36 }),
  kind: varchar('kind', { length: 20 }).notNull().$type<'invitation' | 'comment' | 'reply' | 'mention' | 'task'>(),
  title: varchar('title', { length: 320 }).notNull(),
  deduplicationKey: varchar('deduplication_key', { length: 120 }).notNull(),
  readAt: timestamp('read_at', { fsp: 3 }),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('notifications_inbox').on(table.userId, table.createdAt), uniqueIndex('notifications_dedup').on(table.userId, table.deduplicationKey)])
