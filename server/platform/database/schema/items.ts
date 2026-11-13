import { mysqlTable, varchar, longtext, timestamp, index, customType, foreignKey, mysqlEnum, json, int } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import type { CanvasContent } from '../../../../shared/kernel/content'
import { users } from './identity'
import { workspaces, folders } from './workspaces'

const mediumblob = customType<{
  data: Buffer
}>({ dataType: () => 'mediumblob' })
export const items = mysqlTable('items', {
  kind: mysqlEnum('kind', ['document', 'kanban', 'whiteboard', 'diagram']).notNull().default('document'),
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  folderId: varchar('folder_id', { length: 36 }),
  accessMode: mysqlEnum('access_mode', ['inherit', 'restricted']).notNull().default('inherit'),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 2000 }).notNull().default(''),
  icon: varchar('icon', { length: 32 }),
  createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  archivedAt: timestamp('archived_at'),
  deletedAt: timestamp('deleted_at')
}, table => [
  foreignKey({ columns: [table.folderId, table.workspaceId], foreignColumns: [folders.id, folders.workspaceId], name: 'items_folder_workspace_fk' }),
  index('items_workspace_folder_index').on(table.workspaceId, table.folderId)
])
export const documents = mysqlTable('item_documents', {
  itemId: varchar('item_id', { length: 36 }).primaryKey().references(() => items.id),
  markdown: longtext('markdown').notNull(),
  state: mediumblob('state'),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
})
export const canvases = mysqlTable('item_canvases', {
  itemId: varchar('item_id', { length: 36 }).primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  content: json('content').notNull().$type<CanvasContent>(),
  summary: longtext('summary').notNull(),
  revision: int('revision').notNull().default(0),
  updatedAt: timestamp('updated_at', { fsp: 3 }).notNull().defaultNow()
})
