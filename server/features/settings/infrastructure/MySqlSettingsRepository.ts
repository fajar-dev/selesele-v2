import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { and, count, desc, eq, isNull, lt, sql, inArray, or } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { canvases, documents, folders, items, imageUploads, users, workspaceActivity, workspaceMembers, workspaces } from '../../../platform/database/schema'
import { appendWorkspaceActivity } from './MySqlWorkspaceJournal'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import { defaultNotificationPreferences, defaultWorkspaceSettings } from '../../../../shared/kernel/workspaceSettings'
import type { WorkspaceSettingsChanges, WorkspaceNotificationPreferences } from '../../../../shared/kernel/workspaceSettings'
import type { SettingsRepository } from '../domain/SettingsRepository'

export class MySqlSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database) {
  }

  async save(id: string, userId: string, changes: WorkspaceSettingsChanges) {
    await this.db.transaction(async (tx) => {
      const [workspace] = await tx.select().from(workspaces).where(eq(workspaces.id, id)).for('update')
      const [actor] = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt)))
      if (!workspace || workspace.deletedAt || !actor) {
        throw new ApplicationError('not_found', 'Workspace not found')
      }
      if (actor.role !== 'owner' && actor.role !== 'admin') {
        throw new ApplicationError('forbidden', 'Only workspace managers can update settings')
      }
      const settings = { ...(workspace.settings ?? defaultWorkspaceSettings()), ...changes }
      await tx.update(workspaces).set({ settings, updatedAt: new Date() }).where(eq(workspaces.id, id))
      await appendWorkspaceActivity(tx, id, userId, 'settings.updated', Object.keys(changes).join(', '))
    })
  }

  async notifications(id: string, userId: string) {
    const [row] = await this.db.select({ preferences: workspaceMembers.notifications }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId))).limit(1)
    const preferences = row?.preferences ?? defaultNotificationPreferences()
    const [user] = await this.db.select({ enabled: users.invitationEmail }).from(users).where(eq(users.id, userId))
    return { ...preferences, email: { ...preferences.email, invitation: user?.enabled ?? true } }
  }

  async saveNotifications(id: string, userId: string, preferences: WorkspaceNotificationPreferences) {
    await this.db.transaction(async (tx) => {
      await tx.update(workspaceMembers).set({ notifications: preferences }).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId)))
      await tx.update(users).set({ invitationEmail: preferences.email.invitation }).where(eq(users.id, userId))
    })
  }

  async activity(id: string, userId: string, cursor?: string, memberId?: string) {
    const scope = await loadResourceScope(this.db, userId, id, undefined, true)
    const allowed = [...scope.allowed('item'), ...scope.allowed('folder')]
    const rows = await this.db.select().from(workspaceActivity).where(and(eq(workspaceActivity.workspaceId, id), memberId ? eq(workspaceActivity.subjectMemberId, memberId) : undefined, scope.memberships.some(row => row.member.role === 'owner') ? undefined : or(and(isNull(workspaceActivity.itemId), isNull(workspaceActivity.folderId)), allowed.length ? or(inArray(workspaceActivity.itemId, allowed), inArray(workspaceActivity.folderId, allowed)) : undefined), cursor ? lt(workspaceActivity.id, cursor) : undefined)).orderBy(desc(workspaceActivity.id)).limit(51)
    return rows.map(row => ({ id: row.id, actorName: row.actorName, action: row.action, target: row.target, createdAt: row.createdAt.toISOString() }))
  }

  async usage(id: string, userId: string) {
    const scope = await loadResourceScope(this.db, userId, id)
    const notesAllowed = scope.allowed('item')
    const foldersAllowed = scope.allowed('folder')
    const [[notes], [directories], [members], [bytes]] = await Promise.all([
      notesAllowed.length ? this.db.select({ total: count() }).from(items).leftJoin(folders, eq(folders.id, items.folderId)).where(and(eq(items.workspaceId, id), isNull(items.deletedAt), isNull(folders.deletedAt), inArray(items.id, notesAllowed))) : Promise.resolve([{ total: 0 }]),
      foldersAllowed.length ? this.db.select({ total: count() }).from(folders).where(and(eq(folders.workspaceId, id), isNull(folders.deletedAt), inArray(folders.id, foldersAllowed))) : Promise.resolve([{ total: 0 }]),
      this.db.select({ total: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, id)),
      notesAllowed.length ? this.db.select({ total: sql<number>`coalesce(sum(coalesce(octet_length(${documents.markdown}), 0) + coalesce(octet_length(${documents.state}), 0) + coalesce(octet_length(${canvases.content}), 0)), 0)` }).from(items).leftJoin(documents, eq(items.id, documents.itemId)).leftJoin(canvases, eq(items.id, canvases.itemId)).where(and(eq(items.workspaceId, id), inArray(items.id, notesAllowed))) : Promise.resolve([{ total: 0 }])
    ])
    return { items: Number(notes?.total ?? 0), folders: Number(directories?.total ?? 0), members: Number(members?.total ?? 0), documentBytes: Number(bytes?.total ?? 0) }
  }

  async exportData(id: string, userId: string) {
    const scope = await loadResourceScope(this.db, userId, id)
    const allowedItems = scope.allowed('item')
    const allowedFolders = scope.allowed('folder')
    return this.db.transaction(async (tx) => {
      const [workspace] = await tx.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, id))
      const directories = allowedFolders.length ? await tx.select({ id: folders.id, name: folders.name }).from(folders).where(and(eq(folders.workspaceId, id), isNull(folders.deletedAt), inArray(folders.id, allowedFolders))) : []
      const notes = allowedItems.length
        ? await tx.select({ id: items.id, title: items.title, folderId: items.folderId, kind: items.kind, canvas: canvases.content, markdown: documents.markdown }).from(items)
            .leftJoin(documents, eq(documents.itemId, items.id)).leftJoin(canvases, eq(canvases.itemId, items.id)).leftJoin(folders, eq(folders.id, items.folderId))
            .where(and(eq(items.workspaceId, id), inArray(items.id, allowedItems), isNull(items.deletedAt), isNull(folders.deletedAt)))
        : []
      const images = allowedItems.length ? await tx.select({ filename: imageUploads.filename }).from(imageUploads).where(inArray(imageUploads.itemId, allowedItems)) : []
      return { name: workspace!.name, attachments: images.map(image => image.filename), folders: directories, items: notes.map(row => ({ ...row, markdown: row.markdown ?? '' })) }
    }, { isolationLevel: 'repeatable read', accessMode: 'read only' })
  }

  async archive(id: string, userId: string, archived: boolean) {
    await this.db.transaction(async (tx) => {
      const [workspace] = await tx.select().from(workspaces).where(eq(workspaces.id, id)).for('update')
      const [actor] = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt)))
      if (!workspace || workspace.deletedAt || !actor) {
        throw new ApplicationError('not_found', 'Workspace not found')
      }
      if (actor.role !== 'owner') {
        throw new ApplicationError('forbidden', 'Only the workspace owner can archive or restore the workspace')
      }
      await tx.update(workspaces).set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() }).where(eq(workspaces.id, id))
      await appendWorkspaceActivity(tx, id, userId, archived ? 'workspace.archived' : 'workspace.unarchived', workspace.name)
    })
  }

  async transfer(id: string, actorId: string, targetId: string) {
    return this.db.transaction(async (tx) => {
      const [workspace] = await tx.select({ deletedAt: workspaces.deletedAt }).from(workspaces).where(eq(workspaces.id, id)).for('update')
      if (!workspace || workspace.deletedAt) {
        return false
      }
      const members = await tx.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, id)).for('update')
      if (!members.some(row => row.userId === actorId && row.role === 'owner') || !members.some(row => row.userId === targetId && row.role !== 'owner' && !row.suspendedAt)) {
        return false
      }
      await tx.update(workspaceMembers).set({ role: 'admin' }).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, actorId)))
      await tx.update(workspaceMembers).set({ role: 'owner' }).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, targetId)))
      const previous = members.find(row => row.userId === actorId)!
      const next = members.find(row => row.userId === targetId)!
      await appendWorkspaceActivity(tx, id, actorId, 'workspace.transferred', next.email)
      await appendWorkspaceActivity(tx, id, actorId, 'member.role_changed', `${previous.email}: admin`, { memberId: previous.id })
      await appendWorkspaceActivity(tx, id, actorId, 'member.role_changed', `${next.email}: owner`, { memberId: next.id })
      return true
    })
  }

  async leave(id: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [workspace] = await tx.select({ deletedAt: workspaces.deletedAt }).from(workspaces).where(eq(workspaces.id, id)).for('update')
      if (!workspace || workspace.deletedAt) {
        return false
      }
      const [member] = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId))).for('update')
      if (!member || member.role === 'owner') {
        return false
      }
      await tx.delete(workspaceMembers).where(eq(workspaceMembers.id, member.id))
      await appendWorkspaceActivity(tx, id, userId, 'workspace.left', member.email, { memberId: member.id })
      return true
    })
  }
}
