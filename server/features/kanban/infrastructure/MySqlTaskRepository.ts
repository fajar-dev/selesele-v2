import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { items, canvases, workspaces, workspaceMembers } from '../../../platform/database/schema'
import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import type { MyTask } from '../../../../shared/contracts/task'

export class MySqlTaskRepository {
  constructor(private readonly db: Database) {}
  async assigned(userId: string): Promise<MyTask[]> {
    const ids = (await loadResourceScope(this.db, userId)).allowed('item')
    if (!ids.length) {
      return []
    }
    const rows = await this.db.select({ content: canvases.content, itemId: items.id, itemTitle: items.title, workspaceId: items.workspaceId, workspaceName: workspaces.name, memberId: workspaceMembers.id }).from(items)
      .innerJoin(canvases, eq(canvases.itemId, items.id)).innerJoin(workspaces, eq(workspaces.id, items.workspaceId)).innerJoin(workspaceMembers, and(eq(workspaceMembers.workspaceId, items.workspaceId), eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt)))
      .where(and(inArray(items.id, ids), eq(items.kind, 'kanban'), isNull(items.deletedAt), isNull(items.archivedAt), isNull(workspaces.deletedAt), isNull(workspaces.archivedAt)))
    return rows.flatMap(({ content, memberId, ...board }) => content.kind === 'kanban' ? content.tasks.filter(task => task.assigneeId === memberId).map(task => ({ ...task, ...board, columnTitle: content.columns.find(column => column.id === task.columnId)?.title || 'Unknown' })) : [])
  }
}
