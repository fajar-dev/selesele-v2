import { mysqlTable, varchar, timestamp, index, uniqueIndex, mysqlEnum } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { users } from './identity'
import { DEFAULT_WORKSPACE_ICON } from '../../../../shared/kernel/icons'

export const workspaces = mysqlTable('workspaces', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  name: varchar('name', { length: 120 }).notNull(),
  description: varchar('description', { length: 2000 }).notNull().default(''),
  icon: varchar('icon', { length: 32 }).notNull().default(DEFAULT_WORKSPACE_ICON),
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
  icon: varchar('icon', { length: 32 }),
  description: varchar('description', { length: 2000 }).notNull().default(''),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
}, table => [uniqueIndex('folders_workspace_identity_unique').on(table.id, table.workspaceId), index('folders_workspace_index').on(table.workspaceId)])
