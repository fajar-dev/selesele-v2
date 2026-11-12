import { mysqlTable, varchar, longtext, timestamp, index, customType, foreignKey } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { users } from './identity'
import { workspaces, folders } from './workspaces'

const mediumblob = customType<{ data: Buffer }>({ dataType: () => 'mediumblob' })

export const pages = mysqlTable('pages', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  folderId: varchar('folder_id', { length: 36 }),
  title: varchar('title', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 255 }),
  createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at')
}, table => [
  foreignKey({ columns: [table.folderId, table.workspaceId], foreignColumns: [folders.id, folders.workspaceId], name: 'pages_folder_workspace_fk' }),
  index('pages_workspace_folder_index').on(table.workspaceId, table.folderId)
])

export const documents = mysqlTable('page_documents', {
  pageId: varchar('page_id', { length: 36 }).primaryKey().references(() => pages.id),
  markdown: longtext('markdown').notNull(),
  state: mediumblob('state'),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
})
