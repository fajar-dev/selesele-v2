import { eq } from 'drizzle-orm'
import type { Database, DatabaseTransaction } from '../../../platform/database/client'
import { users, workspaceActivity } from '../../../platform/database/schema'
import type { WorkspaceJournal, ActivityContext } from '../domain/WorkspaceJournal'
import type { WorkspaceActivityAction } from '../../../../shared/kernel/workspaceSettings'

export class MySqlWorkspaceJournal implements WorkspaceJournal {
  constructor(private readonly db: Database) { }
  async record(workspaceId: string, actorId: string, action: WorkspaceActivityAction, target: string, context: ActivityContext = {}) {
    await appendWorkspaceActivity(this.db, workspaceId, actorId, action, target, context)
  }
}
interface JournalEntry { action: WorkspaceActivityAction, target: string, context?: ActivityContext }
export async function appendWorkspaceActivity(db: Database | DatabaseTransaction, workspaceId: string, actorId: string, action: WorkspaceActivityAction, target: string, context: ActivityContext = {}) {
  await appendWorkspaceActivities(db, workspaceId, actorId, [{ action, target, context }])
}
/** A group or policy change snapshots its actor once and inserts its audit entries together. */
export async function appendWorkspaceActivities(db: Database | DatabaseTransaction, workspaceId: string, actorId: string, entries: JournalEntry[]) {
  if (!entries.length) {
    return
  }
  const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, actorId)).limit(1)
  const actorName = actorId === 'system' ? 'Workspace retention' : user?.name || user?.email || 'Former member'
  await db.insert(workspaceActivity).values(entries.map(({ action, target, context = {} }) => ({ workspaceId, actorName, action, target: target.slice(0, 320), subjectMemberId: context.memberId ?? null, pageId: context.pageId ?? null, folderId: context.folderId ?? null })))
}
