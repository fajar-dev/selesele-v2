import type { WorkspaceSettings, WorkspaceNotificationPreferences } from '../../../../shared/kernel/workspaceSettings'
import { mysqlTable, varchar, timestamp, index, uniqueIndex, mysqlEnum, json } from 'drizzle-orm/mysql-core'
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
  deletedAt: timestamp('deleted_at'),
  archivedAt: timestamp('archived_at'),
  settings: json('settings').$type<WorkspaceSettings>()
})

export const workspaceMembers = mysqlTable('workspace_members', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  invitedBy: varchar('invited_by', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  suspendedAt: timestamp('suspended_at'),
  lastActiveAt: timestamp('last_active_at'),
  role: mysqlEnum('role', ['owner', 'admin', 'member', 'viewer']).notNull().default('member'),
  notifications: json('notifications').$type<WorkspaceNotificationPreferences>(),
  joinedAt: timestamp('joined_at').notNull().defaultNow()
}, table => [uniqueIndex('workspace_members_identity_unique').on(table.workspaceId, table.userId), uniqueIndex('workspace_members_email_unique').on(table.workspaceId, table.email), index('workspace_members_user_index').on(table.userId), index('workspace_members_email_index').on(table.email)])

export const folders = mysqlTable('folders', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id),
  name: varchar('name', { length: 120 }).notNull(),
  accessMode: mysqlEnum('access_mode', ['inherit', 'restricted']).notNull().default('inherit'),
  icon: varchar('icon', { length: 32 }),
  description: varchar('description', { length: 2000 }).notNull().default(''),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
}, table => [uniqueIndex('folders_workspace_identity_unique').on(table.id, table.workspaceId), index('folders_workspace_index').on(table.workspaceId)])
