import { canonicalJson } from '../../../../shared/kernel/json'
import { needsSnapshot } from '../../recovery/domain/snapshotPolicy'
import { and, eq, isNull, desc } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { items, canvases, workspaces, workspaceMembers, itemVersions } from '../../../platform/database/schema'
import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { saveItemSnapshot } from '../../../platform/database/itemSnapshots'
import { appendWorkspaceActivities } from '../../settings/infrastructure/MySqlWorkspaceJournal'
import type { CanvasRepository } from '../domain/CanvasRepository'
import type { CanvasContent } from '../../../../shared/kernel/content'
import { canvasSearchText } from '../domain/canvasPolicy'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class MySqlCanvasRepository implements CanvasRepository {
  constructor(private readonly db: Database) {
  }

  async find(itemId: string) {
    const [row] = await this.db.select().from(canvases).where(eq(canvases.itemId, itemId))
    return row ? { content: row.content, revision: row.revision, updatedAt: row.updatedAt.toISOString() } : null
  }

  async save(itemId: string, userId: string, content: CanvasContent, revision: number, checkpoint = false) {
    return this.db.transaction(async (tx) => {
      const [identity] = await tx.select({ workspaceId: items.workspaceId }).from(items).where(eq(items.id, itemId))
      if (!identity) {
        throw new ApplicationError('not_found', 'Item not found')
      }
      const [workspace] = await tx.select().from(workspaces).where(eq(workspaces.id, identity.workspaceId)).for('update')
      const scope = await loadResourceScope(tx, userId, identity.workspaceId)
      const [item] = await tx.select().from(items).where(eq(items.id, itemId)).for('update')
      if (!workspace || workspace.deletedAt || workspace.archivedAt || !item || item.deletedAt || item.archivedAt || !scope.allowed('item', 'edit').includes(itemId)) {
        throw new ApplicationError('forbidden', 'Edit access is no longer available')
      }
      if (item.kind !== content.kind) {
        throw new ApplicationError('invalid_input', 'Item content type does not match')
      }
      const [current] = await tx.select().from(canvases).where(eq(canvases.itemId, itemId)).for('update')
      if (!current || current.revision !== revision) {
        throw new ApplicationError('conflict', 'Another member updated this item. Your draft is preserved; review the latest version before replacing it.')
      }
      if (content.kind === 'kanban') {
        const members = await tx.select({ id: workspaceMembers.id }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, item.workspaceId), isNull(workspaceMembers.suspendedAt)))
        const previous = current.content.kind === 'kanban' ? current.content.tasks : []
        if (content.tasks.some(task => task.assigneeId && previous.find(entry => entry.id === task.id)?.assigneeId !== task.assigneeId && !members.some(member => member.id === task.assigneeId))) {
          throw new ApplicationError('invalid_input', 'Choose an active member of this workspace as assignee')
        }
      }
      const [latest] = await tx.select({ createdAt: itemVersions.createdAt }).from(itemVersions).where(eq(itemVersions.itemId, itemId)).orderBy(desc(itemVersions.createdAt)).limit(1)
      if (needsSnapshot(canonicalJson(current.content), canonicalJson(content), latest?.createdAt || null, new Date(), checkpoint)) {
        await saveItemSnapshot(tx, itemId, JSON.stringify(current.content, null, 2), userId)
      }
      const updatedAt = new Date()
      await tx.update(canvases).set({ content, summary: canvasSearchText(content), revision: revision + 1, updatedAt }).where(eq(canvases.itemId, itemId))
      await tx.update(items).set({ updatedAt: new Date() }).where(eq(items.id, itemId))
      await appendWorkspaceActivities(tx, item.workspaceId, userId, [{ action: 'item.updated', target: item.title, context: { itemId } }])
      return { content, revision: revision + 1, updatedAt: updatedAt.toISOString() }
    })
  }
}
