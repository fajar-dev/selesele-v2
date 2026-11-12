import type { CommentAnchor } from '../../../../shared/kernel/comment'
import { mysqlTable, varchar, text, json, timestamp, index } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { users } from './identity'
import { pages } from './pages'

export const commentThreads = mysqlTable('comment_threads', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  pageId: varchar('page_id', { length: 36 }).notNull().references(() => pages.id, { onDelete: 'cascade' }),
  quote: text('quote').notNull(),
  anchor: json('anchor').$type<CommentAnchor>().notNull(),
  createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 36 }).references(() => users.id)
}, table => [index('comment_threads_page_index').on(table.pageId, table.createdAt)])

export const comments = mysqlTable('comments', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  threadId: varchar('thread_id', { length: 36 }).notNull().references(() => commentThreads.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 36 }).notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, table => [index('comments_thread_index').on(table.threadId, table.createdAt)])
