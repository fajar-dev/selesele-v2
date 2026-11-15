import { mysqlTable, varchar, timestamp, longtext, index, mysqlEnum } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { workspaces } from './workspaces'
import { items } from './items'

export const workspaceTemplates = mysqlTable('workspace_templates', {
  kind: mysqlEnum('kind', ['document', 'kanban', 'whiteboard', 'diagram']).notNull(),
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceItemId: varchar('source_item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 120 }).notNull(), description: varchar('description', { length: 500 }).notNull(),
  icon: varchar('icon', { length: 32 }).notNull(), content: longtext('content').notNull(),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('workspace_templates_workspace').on(table.workspaceId)])
