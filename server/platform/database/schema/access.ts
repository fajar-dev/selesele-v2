import { check, index, mysqlEnum, mysqlTable, primaryKey, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { workspaces, workspaceMembers, folders } from './workspaces'
import { pages } from './pages'

export const memberGroups = mysqlTable('member_groups', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(), description: varchar('description', { length: 500 }).notNull().default('')
}, table => [uniqueIndex('member_groups_name_unique').on(table.workspaceId, table.name)])
export const groupMembers = mysqlTable('group_members', {
  groupId: varchar('group_id', { length: 36 }).notNull().references(() => memberGroups.id, { onDelete: 'cascade' }),
  memberId: varchar('member_id', { length: 36 }).notNull().references(() => workspaceMembers.id, { onDelete: 'cascade' })
}, table => [primaryKey({ columns: [table.groupId, table.memberId] }), index('group_members_member_index').on(table.memberId)])
export const resourceGrants = mysqlTable('resource_grants', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  pageId: varchar('page_id', { length: 36 }).references(() => pages.id, { onDelete: 'cascade' }),
  folderId: varchar('folder_id', { length: 36 }).references(() => folders.id, { onDelete: 'cascade' }),
  memberId: varchar('member_id', { length: 36 }).references(() => workspaceMembers.id, { onDelete: 'cascade' }),
  groupId: varchar('group_id', { length: 36 }).references(() => memberGroups.id, { onDelete: 'cascade' }),
  level: mysqlEnum('level', ['none', 'view', 'comment', 'edit']).notNull(), expiresAt: timestamp('expires_at', { fsp: 3 })
}, table => [
  index('resource_grants_workspace_index').on(table.workspaceId),
  uniqueIndex('resource_grants_page_member').on(table.pageId, table.memberId), uniqueIndex('resource_grants_page_group').on(table.pageId, table.groupId),
  uniqueIndex('resource_grants_folder_member').on(table.folderId, table.memberId), uniqueIndex('resource_grants_folder_group').on(table.folderId, table.groupId),
  check('resource_grants_resource_check', sql`(${table.pageId} is null) <> (${table.folderId} is null)`),
  check('resource_grants_subject_check', sql`(${table.memberId} is null) <> (${table.groupId} is null)`)
])
