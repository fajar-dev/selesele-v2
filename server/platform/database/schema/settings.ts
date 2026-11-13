import { index, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { workspaces } from './workspaces'
import type { WorkspaceActivityAction } from '../../../../shared/kernel/workspaceSettings'

export const workspaceActivity = mysqlTable('workspace_activity', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  workspaceId: varchar('workspace_id', { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  actorName: varchar('actor_name', { length: 255 }).notNull(),
  subjectMemberId: varchar('subject_member_id', { length: 36 }),
  pageId: varchar('page_id', { length: 36 }),
  folderId: varchar('folder_id', { length: 36 }),
  action: varchar('action', { length: 40 }).notNull().$type<WorkspaceActivityAction>(),
  target: varchar('target', { length: 320 }).notNull(),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('workspace_activity_workspace_index').on(table.workspaceId, table.id)])
