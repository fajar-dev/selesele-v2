import { and, eq, inArray } from 'drizzle-orm'
import type { Database, DatabaseTransaction } from '../../../platform/database/client'
import { folders, memberGroups, pages, resourceGrants, workspaceMembers, workspaces, groupMembers } from '../../../platform/database/schema'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import { accessRank } from '../../../../shared/kernel/access'
import type { AccessLevel, ResourceKind, ResourcePolicy } from '../../../../shared/kernel/access'
import type { ResourceAccess } from '../domain/ResourceAccess'
import { loadResourceScope } from './resourceScope'
import { appendWorkspaceActivities } from '../../settings/infrastructure/MySqlWorkspaceJournal'
import { pageMoveImpact } from './pageMovement'

export class MySqlResourceAccess implements ResourceAccess {
  constructor(private readonly db: Database) { }
  async previewMove(pageId: string, folderId: string | null, userId: string) {
    const impact = await pageMoveImpact(this.db, pageId, folderId, userId)
    return impact.canPreviewNames ? impact : { ...impact, changes: impact.changes.map((change, index) => ({ ...change, memberId: `affected-${index}`, name: '' })) }
  }

  async movePage(pageId: string, folderId: string | null, userId: string, acknowledgement?: string) {
    const workspaceId = await this.locate('page', pageId)
    await this.db.transaction(async (tx) => {
      const [workspace] = await tx.select().from(workspaces).where(eq(workspaces.id, workspaceId)).for('update')
      if (!workspace || workspace.deletedAt || workspace.archivedAt) {
        throw new ApplicationError('forbidden', 'Workspace is unavailable or archived')
      }
      const impact = await pageMoveImpact(tx, pageId, folderId, userId)
      if (impact.changes.length && acknowledgement !== impact.token) {
        throw new ApplicationError('conflict', 'Moving this page changes access. Review the current access impact before confirming.')
      }
      await tx.update(pages).set({ folderId, updatedAt: new Date() }).where(eq(pages.id, pageId))
      const [page] = await tx.select({ title: pages.title }).from(pages).where(eq(pages.id, pageId))
      await appendWorkspaceActivities(tx, workspaceId, userId, [{ action: 'page.moved', target: page!.title, context: { pageId } }])
    })
  }

  private async locate(kind: ResourceKind, id: string, db: Database | DatabaseTransaction = this.db) {
    const [row] = kind === 'page'
      ? await db.select({ workspaceId: pages.workspaceId, deletedAt: pages.deletedAt }).from(pages).where(eq(pages.id, id))
      : await db.select({ workspaceId: folders.workspaceId, deletedAt: folders.deletedAt }).from(folders).where(eq(folders.id, id))
    if (!row || row.deletedAt) {
      throw new ApplicationError('not_found', 'Resource not found')
    }
    return row.workspaceId
  }

  async require(kind: ResourceKind, id: string, userId: string, level: AccessLevel) {
    const scope = await loadResourceScope(this.db, userId, await this.locate(kind, id))
    const actual = scope.resolved.get(id)?.level ?? 'none'
    if (!scope.allowed(kind).includes(id)) {
      throw new ApplicationError('not_found', 'Resource not found')
    }
    if (accessRank[actual] < accessRank[level]) {
      throw new ApplicationError('forbidden', 'You do not have permission for this action')
    }
    return actual
  }

  async visible(kind: ResourceKind, workspaceId: string, userId: string) {
    const scope = await loadResourceScope(this.db, userId, workspaceId)
    const allowed = new Set(scope.allowed(kind))
    return [...scope.resolved.values()].filter(item => item.kind === kind && allowed.has(item.id))
  }

  async policy(kind: ResourceKind, id: string, userId: string): Promise<ResourcePolicy> {
    return this.readPolicy(this.db, kind, id, userId)
  }

  private async readPolicy(db: Database | DatabaseTransaction, kind: ResourceKind, id: string, userId: string): Promise<ResourcePolicy> {
    const workspaceId = await this.locate(kind, id, db)
    const scope = await loadResourceScope(db, userId, workspaceId)
    const result = scope.resolved.get(id)
    if (!scope.allowed(kind).includes(id)) {
      throw new ApplicationError('not_found', 'Resource not found')
    }
    if (!result?.canManage) {
      throw new ApplicationError('forbidden', 'Only the owner or an admin with edit access can manage document access')
    }
    return { kind, id, workspaceId, title: result.title, mode: result.mode, grants: scope.grants.filter(grant => kind === 'page' ? grant.pageId === id : grant.folderId === id).map(grant => ({ id: grant.id, memberId: grant.memberId, groupId: grant.groupId, level: grant.level, expiresAt: grant.expiresAt?.toISOString() ?? null })) }
  }

  async save(kind: ResourceKind, id: string, userId: string, input: Parameters<ResourceAccess['save']>[3]) {
    return this.write(kind, id, userId, () => input)
  }

  private async write(kind: ResourceKind, id: string, userId: string, mutate: (policy: ResourcePolicy) => Parameters<ResourceAccess['save']>[3]) {
    let policy = await this.policy(kind, id, userId)
    await this.db.transaction(async (tx) => {
      const [workspace] = await tx.select().from(workspaces).where(eq(workspaces.id, policy.workspaceId)).for('update')
      if (!workspace || workspace.deletedAt) {
        throw new ApplicationError('not_found', 'Workspace not found')
      }
      if (workspace.archivedAt) {
        throw new ApplicationError('forbidden', 'Archived workspaces are read-only')
      }
      policy = await this.readPolicy(tx, kind, id, userId)
      const input = mutate(policy)
      const members = await tx.select({ id: workspaceMembers.id }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, policy.workspaceId))
      const groups = await tx.select({ id: memberGroups.id }).from(memberGroups).where(eq(memberGroups.workspaceId, policy.workspaceId))
      if (input.grants.some(grant => grant.memberId ? !members.some(member => member.id === grant.memberId) : !groups.some(group => group.id === grant.groupId))) {
        throw new ApplicationError('invalid_input', 'Access subjects must belong to this workspace')
      }
      const seen = new Set<string>()
      for (const grant of input.grants) {
        const key = grant.memberId || grant.groupId!
        if (seen.has(key)) {
          throw new ApplicationError('invalid_input', 'Duplicate access subject')
        }
        seen.add(key)
      }
      if (kind === 'page') {
        await tx.update(pages).set({ accessMode: input.mode }).where(eq(pages.id, id))
      } else {
        await tx.update(folders).set({ accessMode: input.mode }).where(eq(folders.id, id))
      }
      await tx.delete(resourceGrants).where(kind === 'page' ? eq(resourceGrants.pageId, id) : eq(resourceGrants.folderId, id))
      if (input.grants.length) {
        await tx.insert(resourceGrants).values(input.grants.map(grant => ({ ...grant, expiresAt: grant.expiresAt ? new Date(grant.expiresAt) : null, workspaceId: policy.workspaceId, pageId: kind === 'page' ? id : null, folderId: kind === 'folder' ? id : null })))
      }
      const groupIds = [...new Set([...policy.grants, ...input.grants].map(grant => grant.groupId).filter((id): id is string => !!id))]
      const affected = groupIds.length ? await tx.select({ memberId: groupMembers.memberId }).from(groupMembers).where(inArray(groupMembers.groupId, groupIds)) : []
      const memberIds = new Set([...affected.map(row => row.memberId), ...[...policy.grants, ...input.grants].map(grant => grant.memberId).filter((id): id is string => !!id)])
      const context = { pageId: kind === 'page' ? id : undefined, folderId: kind === 'folder' ? id : undefined }
      await appendWorkspaceActivities(tx, policy.workspaceId, userId, [
        ...[...memberIds].map(memberId => ({ action: 'resource.access_changed' as const, target: policy.title, context: { ...context, memberId } })),
        { action: 'resource.access_changed', target: policy.title, context }
      ])
    })
  }

  async memberResources(workspaceId: string, memberId: string, actorId: string) {
    const actor = await loadResourceScope(this.db, actorId, workspaceId)
    if (!actor.memberships.some(row => row.member.role === 'owner' || row.member.role === 'admin')) {
      throw new ApplicationError('forbidden', 'Only managers can review access')
    }
    const subject = await loadResourceScope(this.db, actorId, workspaceId, memberId)
    if (!subject.memberships.length) {
      throw new ApplicationError('not_found', 'Member not found')
    }
    const visible = new Set([...actor.allowed('folder'), ...actor.allowed('page')])
    const overrides = new Map(subject.grants.filter(grant => grant.memberId === memberId).map(grant => [grant.pageId || grant.folderId!, grant]))
    return [...subject.resolved.values()].filter(item => visible.has(item.id)).map((item) => {
      const direct = overrides.get(item.id)
      return { ...item, canManage: actor.resolved.get(item.id)?.canManage ?? false, direct: direct ? { id: direct.id, memberId: direct.memberId, groupId: direct.groupId, level: direct.level, expiresAt: direct.expiresAt?.toISOString() ?? null } : null }
    })
  }

  async grant(workspaceId: string, memberId: string, actorId: string, input: Parameters<ResourceAccess['grant']>[3]) {
    const policy = await this.policy(input.kind, input.resourceId, actorId)
    if (policy.workspaceId !== workspaceId) {
      throw new ApplicationError('not_found', 'Resource not found')
    }
    const [member] = await this.db.select().from(workspaceMembers).where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)))
    if (!member || member.role === 'owner') {
      throw new ApplicationError('invalid_input', 'Owner access cannot be restricted')
    }
    await this.write(input.kind, input.resourceId, actorId, current => ({ mode: current.mode, grants: [...current.grants.filter(grant => grant.memberId !== memberId), ...(input.level ? [{ memberId, groupId: null, level: input.level, expiresAt: input.expiresAt }] : [])] }))
  }
}
