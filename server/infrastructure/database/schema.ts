import { mysqlTable, varchar, text, longtext, timestamp, boolean, index, uniqueIndex, customType, mysqlEnum, foreignKey } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'

const mediumblob = customType<{ data: Buffer }>({ dataType: () => 'mediumblob' })

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  email: varchar('email', { length: 255 }).notNull().unique(),
  microsoftSubject: varchar('microsoft_subject', { length: 73 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatar: text('avatar'),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  isActive: boolean('is_active').default(true)
})

export const workspaces = mysqlTable('workspaces', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  name: varchar('name', { length: 120 }).notNull(),
  icon: varchar('icon', { length: 32 }).notNull().default('🏡'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at')
})

export const workspaceMembers = mysqlTable('workspace_members', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  role: mysqlEnum('role', ['owner', 'admin', 'member']).notNull().default('member'),
  joinedAt: timestamp('joined_at').notNull().defaultNow()
}, table => [uniqueIndex('workspace_members_identity_unique').on(table.workspaceId, table.userId), index('workspace_members_user_index').on(table.userId)])

export const workspaceInvitations = mysqlTable('workspace_invitations', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['admin', 'member']).notNull().default('member'),
  invitedBy: varchar('invited_by', { length: 36 }).notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, table => [uniqueIndex('workspace_invitation_email_unique').on(table.workspaceId, table.email), index('workspace_invitation_email_index').on(table.email)])

export const folders = mysqlTable('folders', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  name: varchar('name', { length: 120 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
}, table => [uniqueIndex('folders_workspace_identity_unique').on(table.id, table.workspaceId), index('folders_workspace_index').on(table.workspaceId)])

export const pages = mysqlTable('pages', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  folderId: varchar('folder_id', { length: 36 }),
  title: varchar('title', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 255 }),
  description: text('description'),
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

export const sessions = mysqlTable('sessions', {
  tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull()
}, table => [index('sessions_user_index').on(table.userId), index('sessions_expiry_index').on(table.expiresAt)])
