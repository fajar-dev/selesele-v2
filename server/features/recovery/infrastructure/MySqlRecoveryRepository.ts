import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { savePageSnapshot } from '../../../platform/database/pageSnapshots'
import { snapshotPolicy } from '../domain/snapshotPolicy'
import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { documents, folders, pages, pageVersions, users, workspaceMembers, workspaces } from '../../../platform/database/schema'
import type { RecoveryRepository } from '../domain/RecoveryRepository'
import type { TrashKind, TrashItem } from '../../../../shared/contracts/recovery'

export class MySqlRecoveryRepository implements RecoveryRepository {
  constructor(private readonly db: Database) {}
  trash(userId: string): Promise<TrashItem[]> {
    return this.items(userId)
  }

  async findTrashed(userId: string, kind: TrashKind, id: string): Promise<TrashItem | null> {
    const [item] = await this.items(userId, { kind, id })
    return item ?? null
  }

  private async items(userId: string, selection?: { kind: TrashKind, id: string }): Promise<TrashItem[]> {
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
      includes('page')
        ? this.db.select({ id: pages.id, title: pages.title, icon: pages.icon, workspaceName: workspaces.name, deletedAt: pages.deletedAt, workspaceId: pages.workspaceId, role: workspaceMembers.role }).from(pages)
            .innerJoin(workspaces, eq(workspaces.id, pages.workspaceId)).innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id)).leftJoin(folders, eq(folders.id, pages.folderId))
            .where(and(eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt), isNull(folders.deletedAt), isNotNull(pages.deletedAt), selection ? eq(pages.id, selection.id) : undefined))
        : Promise.resolve([])
    ])
    const present = (rows: Array<Omit<(typeof spaces)[number], 'icon'> & { icon: string | null }>, kind: TrashKind) => rows.map(row => ({ id: row.id, title: row.title, icon: row.icon, workspaceName: row.workspaceName, workspaceId: row.workspaceId, deletedAt: row.deletedAt!.toISOString(), kind, canRestore: kind === 'workspace' ? row.role === 'owner' : scope.resolved.get(row.id)?.level === 'edit', canPurge: (row.role === 'owner' || row.role === 'admin') && (kind === 'workspace' || scope.resolved.get(row.id)?.level === 'edit') }))
    const scope = await loadResourceScope(this.db, userId, undefined, undefined, true)
    const allowed = new Set([...scope.allowed('page'), ...scope.allowed('folder')])
    return [...present(spaces, 'workspace'), ...present(directories, 'folder'), ...present(notes, 'page')].filter(item => item.kind === 'workspace' || allowed.has(item.id)).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  }

  async restore(kind: TrashKind, id: string) {
    if (kind === 'workspace') {
      await this.db.update(workspaces).set({ deletedAt: null }).where(eq(workspaces.id, id))
    } else if (kind === 'folder') {
      await this.db.update(folders).set({ deletedAt: null }).where(eq(folders.id, id))
    } else {
      await this.db.update(pages).set({ deletedAt: null }).where(eq(pages.id, id))
    }
  }

  async purge(kind: TrashKind, id: string, expiredBefore?: Date) {
    return this.db.transaction(async (tx) => {
      const [current] = kind === 'page'
        ? await tx.select({ deletedAt: pages.deletedAt }).from(pages).where(eq(pages.id, id)).for('update')
        : kind === 'folder'
          ? await tx.select({ deletedAt: folders.deletedAt }).from(folders).where(eq(folders.id, id)).for('update')
          : await tx.select({ deletedAt: workspaces.deletedAt }).from(workspaces).where(eq(workspaces.id, id)).for('update')
      if (!current?.deletedAt || (expiredBefore && current.deletedAt > expiredBefore)) {
        return false
      }
      const rows = kind === 'page' ? [{ id }] : await tx.select({ id: pages.id }).from(pages).where(kind === 'folder' ? eq(pages.folderId, id) : eq(pages.workspaceId, id))
      const ids = rows.map(row => row.id)
      if (ids.length) {
        await tx.delete(documents).where(inArray(documents.pageId, ids))
        await tx.delete(pages).where(inArray(pages.id, ids))
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

  async versions(pageId: string) {
    const rows = await this.db.select({ id: pageVersions.id, createdAt: pageVersions.createdAt, author: users.name }).from(pageVersions)
      .leftJoin(users, eq(users.id, pageVersions.authorId)).where(eq(pageVersions.pageId, pageId)).orderBy(desc(pageVersions.createdAt), desc(pageVersions.id)).limit(snapshotPolicy.limit)
    return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }))
  }

  async version(pageId: string, id: string) {
    const [row] = await this.db.select({ markdown: pageVersions.markdown }).from(pageVersions).where(and(eq(pageVersions.pageId, pageId), eq(pageVersions.id, id))).limit(1)
    return row?.markdown ?? null
  }

  async checkpoint(pageId: string, userId: string) {
    await this.db.transaction(async (tx) => {
      await tx.select({ id: pages.id }).from(pages).where(eq(pages.id, pageId)).for('update')
      const [row] = await tx.select({ markdown: documents.markdown }).from(documents).where(eq(documents.pageId, pageId))
      if (row) {
        await savePageSnapshot(tx, pageId, row.markdown, userId)
      }
    })
  }
}
