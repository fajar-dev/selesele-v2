import { mysqlTable, varchar, timestamp, longtext, index, primaryKey, uniqueIndex } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { pages } from './pages'
import { users } from './identity'
import { workspaces } from './workspaces'

export const pageVersions = mysqlTable('page_versions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  pageId: varchar('page_id', { length: 36 }).notNull().references(() => pages.id, { onDelete: 'cascade' }),
  markdown: longtext('markdown').notNull(),
  authorId: varchar('author_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('page_versions_page_time').on(table.pageId, table.createdAt)])
export const pageActivity = mysqlTable('page_activity', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  pageId: varchar('page_id', { length: 36 }).notNull().references(() => pages.id, { onDelete: 'cascade' }),
  favoriteAt: timestamp('favorite_at'),
  visitedAt: timestamp('visited_at')
}, table => [primaryKey({ columns: [table.userId, table.pageId] }), index('page_activity_recent').on(table.userId, table.visitedAt)])
export const pageLinks = mysqlTable('page_links', {
  sourceId: varchar('source_id', { length: 36 }).notNull().references(() => pages.id, { onDelete: 'cascade' }),
  targetId: varchar('target_id', { length: 36 }).notNull().references(() => pages.id, { onDelete: 'cascade' })
}, table => [primaryKey({ columns: [table.sourceId, table.targetId] }), index('page_links_target').on(table.targetId)])
export const pageMentions = mysqlTable('page_mentions', {
  pageId: varchar('page_id', { length: 36 }).notNull().references(() => pages.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' })
}, table => [primaryKey({ columns: [table.pageId, table.userId] })])
export const notifications = mysqlTable('notifications', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  pageId: varchar('page_id', { length: 36 }).references(() => pages.id, { onDelete: 'cascade' }),
  threadId: varchar('thread_id', { length: 36 }),
  kind: varchar('kind', { length: 20 }).notNull().$type<'invitation' | 'comment' | 'reply' | 'mention'>(),
  title: varchar('title', { length: 320 }).notNull(),
  deduplicationKey: varchar('deduplication_key', { length: 120 }).notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, table => [index('notifications_inbox').on(table.userId, table.createdAt), uniqueIndex('notifications_dedup').on(table.userId, table.deduplicationKey)])
