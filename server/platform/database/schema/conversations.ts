import { mysqlTable, varchar, timestamp, longtext, json, int, index, boolean } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import type { KnowledgeAnswer } from '../../../../shared/model/library'
import { users } from './authentication'
import { workspaces } from './workspaces'

export const conversations = mysqlTable('conversations', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  pinned: boolean('pinned').notNull().default(false),
  title: varchar('title', { length: 120 }).notNull(), revision: int('revision').notNull().default(0),
  updatedAt: timestamp('updated_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('conversations_owner_time').on(table.userId, table.workspaceId, table.updatedAt)])
export const conversationMessages = mysqlTable('conversation_messages', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  conversationId: varchar('conversation_id', { length: 36 }).notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 12 }).notNull().$type<'user' | 'assistant'>(),
  content: longtext('content').notNull(), sources: json('sources').notNull().$type<KnowledgeAnswer['sources']>(),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('conversation_message_order').on(table.conversationId, table.id)])
