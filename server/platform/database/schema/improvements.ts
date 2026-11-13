import { mysqlTable, varchar, timestamp, longtext, json, int, index } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import type { KnowledgeAnswer } from '../../../../shared/kernel/library'
import { users } from './identity'
import { workspaces } from './workspaces'
import { pages } from './pages'

export const conversations = mysqlTable('ai_conversations', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 120 }).notNull(), revision: int('revision').notNull().default(0),
  updatedAt: timestamp('updated_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('conversations_owner_time').on(table.userId, table.workspaceId, table.updatedAt)])
export const conversationMessages = mysqlTable('ai_conversation_messages', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  conversationId: varchar('conversation_id', { length: 36 }).notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 12 }).notNull().$type<'user' | 'assistant'>(),
  content: longtext('content').notNull(), sources: json('sources').notNull().$type<KnowledgeAnswer['sources']>(),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('conversation_message_order').on(table.conversationId, table.id)])
export const workspaceTemplates = mysqlTable('workspace_templates', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sourcePageId: varchar('source_page_id', { length: 36 }).notNull().references(() => pages.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 120 }).notNull(), description: varchar('description', { length: 500 }).notNull(),
  icon: varchar('icon', { length: 32 }).notNull(), content: longtext('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, table => [index('workspace_templates_workspace').on(table.workspaceId)])
