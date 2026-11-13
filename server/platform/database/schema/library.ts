import { mysqlTable, varchar, timestamp, longtext, index, primaryKey, uniqueIndex } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { items } from './items'
import { users } from './identity'
import { workspaces } from './workspaces'

export const itemVersions = mysqlTable('item_versions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  content: longtext('content').notNull(),
  authorId: varchar('author_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('item_versions_item_time').on(table.itemId, table.createdAt)])
export const itemActivity = mysqlTable('item_activity', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  favoriteAt: timestamp('favorite_at'),
  visitedAt: timestamp('visited_at')
}, table => [primaryKey({ columns: [table.userId, table.itemId] }), index('item_activity_recent').on(table.userId, table.visitedAt)])
export const itemLinks = mysqlTable('item_links', {
  sourceId: varchar('source_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  targetId: varchar('target_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' })
}, table => [primaryKey({ columns: [table.sourceId, table.targetId] }), index('item_links_target').on(table.targetId)])
export const itemMentions = mysqlTable('item_mentions', {
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' })
}, table => [primaryKey({ columns: [table.itemId, table.userId] })])
export const notifications = mysqlTable('notifications', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 36 }).references(() => items.id, { onDelete: 'cascade' }),
  threadId: varchar('thread_id', { length: 36 }),
  kind: varchar('kind', { length: 20 }).notNull().$type<'invitation' | 'comment' | 'reply' | 'mention'>(),
  title: varchar('title', { length: 320 }).notNull(),
  deduplicationKey: varchar('deduplication_key', { length: 120 }).notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, table => [index('notifications_inbox').on(table.userId, table.createdAt), uniqueIndex('notifications_dedup').on(table.userId, table.deduplicationKey)])
