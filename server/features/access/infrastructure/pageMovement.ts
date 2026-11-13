import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { Database, DatabaseTransaction } from '../../../platform/database/client'
import { pages, folders, workspaceMembers, users, resourceGrants, groupMembers } from '../../../platform/database/schema'
import { loadResourceScope } from './resourceScope'
import { movedPageAccess } from '../domain/movePolicy'
import type { AccessGrant, MoveImpact } from '../../../../shared/kernel/access'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export async function pageMoveImpact(db: Database | DatabaseTransaction, pageId: string, folderId: string | null, userId: string): Promise<MoveImpact> {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId))
  if (!page || page.deletedAt || page.archivedAt) {
    throw new ApplicationError('not_found', 'Active page not found')
  }
  const actor = await loadResourceScope(db, userId, page.workspaceId)
  const actorPage = actor.resolved.get(pageId)
  const workspace = actor.memberships[0]?.workspace
  if (!actor.allowed('page', 'edit').includes(pageId) || !workspace || workspace.archivedAt) {
    throw new ApplicationError('forbidden', 'Edit access is required to move this page')
  }
  if (folderId && !actor.allowed('folder', 'edit').includes(folderId)) {
    throw new ApplicationError('not_found', 'Destination folder not found or not editable')
  }
  const directories = await db.select().from(folders).where(eq(folders.workspaceId, page.workspaceId))
  const members = await db.select({ member: workspaceMembers, name: users.name }).from(workspaceMembers).leftJoin(users, eq(users.id, workspaceMembers.userId)).where(eq(workspaceMembers.workspaceId, page.workspaceId)).orderBy(workspaceMembers.id)
  const grants = await db.select().from(resourceGrants).where(eq(resourceGrants.workspaceId, page.workspaceId))
  const groups = await db.select({ memberId: groupMembers.memberId, groupId: groupMembers.groupId }).from(groupMembers).innerJoin(workspaceMembers, and(eq(workspaceMembers.id, groupMembers.memberId), eq(workspaceMembers.workspaceId, page.workspaceId)))
  const policy = (id: string, kind: 'page' | 'folder') => {
    const mode = kind === 'page' ? page.accessMode : directories.find(item => item.id === id)!.accessMode
    const values: AccessGrant[] = grants.filter(grant => kind === 'page' ? grant.pageId === id : grant.folderId === id).map(grant => ({ id: grant.id, memberId: grant.memberId, groupId: grant.groupId, level: grant.level, expiresAt: grant.expiresAt?.toISOString() || null }))
    return { mode, grants: values }
  }
  const pagePolicy = policy(pageId, 'page')
  const now = new Date()
  const changes: MoveImpact['changes'] = []
  for (const { member, name } of members) {
    const subject = { id: member.id, role: member.role, suspended: !!member.suspendedAt, groupIds: groups.filter(group => group.memberId === member.id).map(group => group.groupId) }
    const before = movedPageAccess(subject, pagePolicy, page.folderId ? policy(page.folderId, 'folder') : null, now)
    const after = movedPageAccess(subject, pagePolicy, folderId ? policy(folderId, 'folder') : null, now)
    if (before !== after) {
      changes.push({ memberId: member.id, name: name || member.email, before, after })
    }
  }
  const token = createHash('sha256').update(JSON.stringify({ pageId, from: page.folderId, to: folderId, changes })).digest('hex')
  return { token, changes, canPreviewNames: !!actorPage?.canManage }
}
