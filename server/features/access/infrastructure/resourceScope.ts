import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { Database, DatabaseTransaction } from '../../../platform/database/client'
import { folders, groupMembers, items, resourceGrants, workspaceMembers, workspaces } from '../../../platform/database/schema'
import { accessRank } from '../../../../shared/kernel/access'
import type { AccessGrant, AccessLevel, MemberResourceAccess, ResourceKind } from '../../../../shared/kernel/access'
import { resolveResourceAccess } from '../domain/accessPolicy'
/** One permission evaluator serves direct access, lists, search, exports and notifications. */
export async function loadResourceScope(db: Database | DatabaseTransaction, userId: string, workspaceId?: string, subjectMemberId?: string, includeDeleted = false) {
  const memberships = await db.select({ member: workspaceMembers, workspace: workspaces }).from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(subjectMemberId ? eq(workspaceMembers.id, subjectMemberId) : eq(workspaceMembers.userId, userId), workspaceId ? eq(workspaces.id, workspaceId) : undefined, includeDeleted ? undefined : isNull(workspaces.deletedAt), subjectMemberId ? undefined : isNull(workspaceMembers.suspendedAt)))
  const ids = memberships.map(row => row.workspace.id)
  const [directories, notes, grants, groups] = ids.length
    ? await Promise.all([
        db.select().from(folders).where(inArray(folders.workspaceId, ids)),
        db.select().from(items).where(inArray(items.workspaceId, ids)),
        db.select().from(resourceGrants).where(inArray(resourceGrants.workspaceId, ids)),
        db.select().from(groupMembers).where(inArray(groupMembers.memberId, memberships.map(row => row.member.id)))
      ])
    : [[], [], [], []]
  const resolved = new Map<string, MemberResourceAccess>()
  const now = new Date()
  function indexBy<T>(rows: T[], key: (row: T) => string) {
    const index = new Map<string, T[]>()
    for (const row of rows) {
      const id = key(row)
      const bucket = index.get(id) || []
      bucket.push(row)
      index.set(id, bucket)
    }
    return index
  }
  const folderById = new Map(directories.map(row => [row.id, row]))
  const itemById = new Map(notes.map(row => [row.id, row]))
  const workspaceFolders = indexBy(directories, row => row.workspaceId)
  const workspaceItems = indexBy(notes, row => row.workspaceId)
  const memberGroups = indexBy(groups, row => row.memberId)
  const resourceGrantsById = indexBy(grants, row => row.itemId || row.folderId!)
  const policyGrants = (id: string): AccessGrant[] => (resourceGrantsById.get(id) || []).map(row => ({ id: row.id, memberId: row.memberId, groupId: row.groupId, level: row.level, expiresAt: row.expiresAt?.toISOString() ?? null }))
  for (const row of memberships) {
    const subject = { id: row.member.id, role: row.member.role, suspended: !!row.member.suspendedAt, groupIds: (memberGroups.get(row.member.id) || []).map(group => group.groupId) }
    for (const folder of (workspaceFolders.get(row.workspace.id) || [])) {
      const result = resolveResourceAccess(subject, folder.accessMode, policyGrants(folder.id), 'edit', now)
      resolved.set(folder.id, { ...result, kind: 'folder', id: folder.id, title: folder.name, mode: folder.accessMode, folderId: null, parentLevel: 'edit', canManage: row.member.role === 'owner' || (row.member.role === 'admin' && result.level === 'edit') })
    }
    for (const item of (workspaceItems.get(row.workspace.id) || [])) {
      const parent = item.folderId ? resolved.get(item.folderId)?.level ?? 'none' : 'edit'
      const result = resolveResourceAccess(subject, item.accessMode, policyGrants(item.id), parent, now)
      resolved.set(item.id, { ...result, kind: 'item', id: item.id, title: item.title, mode: item.accessMode, folderId: item.folderId, parentLevel: parent, canManage: row.member.role === 'owner' || (row.member.role === 'admin' && result.level === 'edit') })
    }
  }
  const allowed = (kind: ResourceKind, level: AccessLevel = 'view') => [...resolved.values()].filter(item => item.kind === kind && accessRank[item.level] >= accessRank[level] && (includeDeleted || (kind === 'folder'
    ? !folderById.get(item.id)?.deletedAt
    : !itemById.get(item.id)?.deletedAt && (!item.folderId || !folderById.get(item.folderId)?.deletedAt)))).map(item => item.id)
  return { memberships, directories, notes, grants, resolved, allowed }
}
