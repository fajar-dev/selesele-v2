import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { Database, DatabaseTransaction } from '../../../platform/database/client'
import { items, folders, workspaceMembers, users, resourceGrants, groupMembers } from '../../../platform/database/schema'
import { loadResourceScope } from './resourceScope'
import { movedItemAccess } from '../domain/movePolicy'
import type { AccessGrant, MoveImpact } from '../../../../shared/kernel/access'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export async function itemMoveImpact(db: Database | DatabaseTransaction, itemId: string, folderId: string | null, userId: string): Promise<MoveImpact> {
  const [item] = await db.select().from(items).where(eq(items.id, itemId))
  if (!item || item.deletedAt || item.archivedAt) {
    throw new ApplicationError('not_found', 'Active item not found')
  }
  const actor = await loadResourceScope(db, userId, item.workspaceId)
  const actorItem = actor.resolved.get(itemId)
  const workspace = actor.memberships[0]?.workspace
  if (!actor.allowed('item', 'edit').includes(itemId) || !workspace || workspace.archivedAt) {
    throw new ApplicationError('forbidden', 'Edit access is required to move this item')
  }
  if (folderId && !actor.allowed('folder', 'edit').includes(folderId)) {
    throw new ApplicationError('not_found', 'Destination folder not found or not editable')
  }
  const directories = await db.select().from(folders).where(eq(folders.workspaceId, item.workspaceId))
  const members = await db.select({ member: workspaceMembers, name: users.name }).from(workspaceMembers).leftJoin(users, eq(users.id, workspaceMembers.userId)).where(eq(workspaceMembers.workspaceId, item.workspaceId)).orderBy(workspaceMembers.id)
  const grants = await db.select().from(resourceGrants).where(eq(resourceGrants.workspaceId, item.workspaceId))
  const groups = await db.select({ memberId: groupMembers.memberId, groupId: groupMembers.groupId }).from(groupMembers).innerJoin(workspaceMembers, and(eq(workspaceMembers.id, groupMembers.memberId), eq(workspaceMembers.workspaceId, item.workspaceId)))
  const policy = (id: string, kind: 'item' | 'folder') => {
    const mode = kind === 'item' ? item.accessMode : directories.find(item => item.id === id)!.accessMode
    const values: AccessGrant[] = grants.filter(grant => kind === 'item' ? grant.itemId === id : grant.folderId === id).map(grant => ({ id: grant.id, memberId: grant.memberId, groupId: grant.groupId, level: grant.level, expiresAt: grant.expiresAt?.toISOString() || null }))
    return { mode, grants: values }
  }
  const itemPolicy = policy(itemId, 'item')
  const now = new Date()
  const changes: MoveImpact['changes'] = []
  for (const { member, name } of members) {
    const subject = { id: member.id, role: member.role, suspended: !!member.suspendedAt, groupIds: groups.filter(group => group.memberId === member.id).map(group => group.groupId) }
    const before = movedItemAccess(subject, itemPolicy, item.folderId ? policy(item.folderId, 'folder') : null, now)
    const after = movedItemAccess(subject, itemPolicy, folderId ? policy(folderId, 'folder') : null, now)
    if (before !== after) {
      changes.push({ memberId: member.id, name: name || member.email, before, after })
    }
  }
  const token = createHash('sha256').update(JSON.stringify({ itemId, from: item.folderId, to: folderId, changes })).digest('hex')
  return { token, changes, canPreviewNames: !!actorItem?.canManage }
}
