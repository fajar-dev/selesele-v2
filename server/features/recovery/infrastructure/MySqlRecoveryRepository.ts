import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { saveItemSnapshot } from '../../../platform/database/itemSnapshots'
import { snapshotPolicy } from '../domain/snapshotPolicy'
import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { canvases, documents, folders, items, itemVersions, users, workspaceMembers, workspaces } from '../../../platform/database/schema'
import type { RecoveryRepository } from '../domain/RecoveryRepository'
import type { TrashKind, TrashItem } from '../../../../shared/contracts/recovery'

export class MySqlRecoveryRepository implements RecoveryRepository {
  constructor(private readonly db: Database) {
  }

  trash(userId: string): Promise<TrashItem[]> {
    return this.items(userId)
  }

  async findTrashed(userId: string, kind: TrashKind, id: string): Promise<TrashItem | null> {
    const [item] = await this.items(userId, { kind, id })
    return item ?? null
  }

  private async items(userId: string, selection?: {
    kind: TrashKind
    id: string
  }): Promise<TrashItem[]> {
    const includes = (kind: TrashKind) => !selection || selection.kind === kind
    const [spaces, directories, notes] = await Promise.all([
      includes('workspace')
        ? this.db.select({ id: workspaces.id, title: workspaces.name, icon: workspaces.icon, workspaceName: workspaces.name, deletedAt: workspaces.deletedAt, workspaceId: workspaces.id, role: workspaceMembers.role }).from(workspaces)
            .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id)).where(and(eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), eq(workspaceMembers.role, 'owner'), isNotNull(workspaces.deletedAt), selection ? eq(workspaces.id, selection.id) : undefined))
        : Promise.resolve([]),
      includes('folder')
        ? this.db.select({ id: folders.id, title: folders.name, icon: folders.icon, workspaceName: workspaces.name, deletedAt: folders.deletedAt, workspaceId: folders.workspaceId, role: workspaceMembers.role }).from(folders)
            .innerJoin(workspaces, eq(workspaces.id, folders.workspaceId)).innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
            .where(and(eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt), isNotNull(folders.deletedAt), selection ? eq(folders.id, selection.id) : undefined))
        : Promise.resolve([]),
      includes('item')
        ? this.db.select({ id: items.id, title: items.title, icon: items.icon, workspaceName: workspaces.name, deletedAt: items.deletedAt, workspaceId: items.workspaceId, role: workspaceMembers.role }).from(items)
            .innerJoin(workspaces, eq(workspaces.id, items.workspaceId)).innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id)).leftJoin(folders, eq(folders.id, items.folderId))
            .where(and(eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt), isNull(folders.deletedAt), isNotNull(items.deletedAt), selection ? eq(items.id, selection.id) : undefined))
        : Promise.resolve([])
    ])
    const present = (rows: Array<Omit<(typeof spaces)[number], 'icon'> & {
      icon: string | null
    }>, kind: TrashKind) => rows.map(row => ({ id: row.id, title: row.title, icon: row.icon, workspaceName: row.workspaceName, workspaceId: row.workspaceId, deletedAt: row.deletedAt!.toISOString(), kind, canRestore: kind === 'workspace' ? row.role === 'owner' : scope.resolved.get(row.id)?.level === 'edit', canPurge: (row.role === 'owner' || row.role === 'admin') && (kind === 'workspace' || scope.resolved.get(row.id)?.level === 'edit') }))
    const scope = await loadResourceScope(this.db, userId, undefined, undefined, true)
    const allowed = new Set([...scope.allowed('item'), ...scope.allowed('folder')])
    return [...present(spaces, 'workspace'), ...present(directories, 'folder'), ...present(notes, 'item')].filter(item => item.kind === 'workspace' || allowed.has(item.id)).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  }

  async restore(kind: TrashKind, id: string) {
    if (kind === 'workspace') {
      await this.db.update(workspaces).set({ deletedAt: null }).where(eq(workspaces.id, id))
    } else if (kind === 'folder') {
      await this.db.update(folders).set({ deletedAt: null }).where(eq(folders.id, id))
    } else {
      await this.db.update(items).set({ deletedAt: null }).where(eq(items.id, id))
    }
  }

  async purge(kind: TrashKind, id: string, expiredBefore?: Date) {
    return this.db.transaction(async (tx) => {
      const [current] = kind === 'item'
        ? await tx.select({ deletedAt: items.deletedAt }).from(items).where(eq(items.id, id)).for('update')
        : kind === 'folder'
          ? await tx.select({ deletedAt: folders.deletedAt }).from(folders).where(eq(folders.id, id)).for('update')
          : await tx.select({ deletedAt: workspaces.deletedAt }).from(workspaces).where(eq(workspaces.id, id)).for('update')
      if (!current?.deletedAt || (expiredBefore && current.deletedAt > expiredBefore)) {
        return false
      }
      const rows = kind === 'item' ? [{ id }] : await tx.select({ id: items.id }).from(items).where(kind === 'folder' ? eq(items.folderId, id) : eq(items.workspaceId, id))
      const ids = rows.map(row => row.id)
      if (ids.length) {
        await tx.delete(documents).where(inArray(documents.itemId, ids))
        await tx.delete(items).where(inArray(items.id, ids))
      }
      if (kind === 'folder') {
        await tx.delete(folders).where(eq(folders.id, id))
      }
      if (kind === 'workspace') {
        await tx.delete(folders).where(eq(folders.workspaceId, id))
        await tx.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, id))
        await tx.delete(workspaces).where(eq(workspaces.id, id))
      }
      return true
    })
  }

  async versions(itemId: string) {
    const rows = await this.db.select({ id: itemVersions.id, createdAt: itemVersions.createdAt, author: users.name }).from(itemVersions)
      .leftJoin(users, eq(users.id, itemVersions.authorId)).where(eq(itemVersions.itemId, itemId)).orderBy(desc(itemVersions.createdAt), desc(itemVersions.id)).limit(snapshotPolicy.limit)
    return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }))
  }

  async version(itemId: string, id: string) {
    const [row] = await this.db.select({ markdown: itemVersions.content }).from(itemVersions).where(and(eq(itemVersions.itemId, itemId), eq(itemVersions.id, id))).limit(1)
    return row?.markdown ?? null
  }

  async checkpoint(itemId: string, userId: string) {
    await this.db.transaction(async (tx) => {
      await tx.select({ id: items.id }).from(items).where(eq(items.id, itemId)).for('update')
      const [row] = await tx.select({ markdown: documents.markdown }).from(documents).where(eq(documents.itemId, itemId))
      const [canvas] = await tx.select().from(canvases).where(eq(canvases.itemId, itemId))
      if (row || canvas) {
        await saveItemSnapshot(tx, itemId, row?.markdown ?? JSON.stringify(canvas!.content, null, 2), userId)
      }
    })
  }
}
