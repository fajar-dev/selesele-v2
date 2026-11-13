import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { and, asc, count, desc, eq, inArray, isNull, isNotNull, lt, or, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Database, DatabaseTransaction } from '../../../platform/database/client'
import { groupMembers, memberGroups, notifications, resourceGrants, users, workspaceMembers, workspaces } from '../../../platform/database/schema'
import type { MemberRepository, MemberQuery } from '../domain/MemberRepository'
import type { MemberItem, MemberAddInput, MemberAddResult, MemberGroup } from '../../../../shared/kernel/member'
import { defaultWorkspaceSettings, allowsWorkspaceAction } from '../../../../shared/kernel/workspaceSettings'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import { requireMemberManagement } from '../domain/memberPolicy'
import { appendWorkspaceActivity, appendWorkspaceActivities } from '../../settings/infrastructure/MySqlWorkspaceJournal'
import { enqueueEmail } from '../../mail/infrastructure/enqueueEmail'
import { emailExcerpt } from '../../mail/domain/EmailActivity'

export class MySqlMemberRepository implements MemberRepository {
  constructor(private readonly db: Database, private readonly emailEnabled: boolean) { }
  private async gate(tx: DatabaseTransaction, id: string, userId: string) {
    const [workspace] = await tx.select().from(workspaces).where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt))).for('update')
    const [actor] = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt))).for('update')
    if (!workspace || !actor) {
      throw new ApplicationError('not_found', 'Workspace not found')
    }
    if (workspace.archivedAt) {
      throw new ApplicationError('forbidden', 'Workspace is archived')
    }
    return { workspace, actor }
  }

  private rows(id: string) {
    return this.db.select({ member: workspaceMembers, name: users.name, avatar: users.avatar }).from(workspaceMembers).leftJoin(users, eq(users.id, workspaceMembers.userId)).where(eq(workspaceMembers.workspaceId, id)).$dynamic()
  }

  private async present(rows: {
    member: typeof workspaceMembers.$inferSelect
    name: string | null
    avatar: string | null
  }[]): Promise<MemberItem[]> {
    const ids = rows.map(row => row.member.id)
    const groups = ids.length ? await this.db.select({ memberId: groupMembers.memberId, id: memberGroups.id, name: memberGroups.name }).from(groupMembers).innerJoin(memberGroups, eq(memberGroups.id, groupMembers.groupId)).where(inArray(groupMembers.memberId, ids)) : []
    const actorIds = [...new Set(rows.map(row => row.member.invitedBy).filter((id): id is string => !!id))]
    const actors = actorIds.length ? await this.db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, actorIds)) : []
    return rows.map(({ member, name, avatar }) => ({ id: member.id, userId: member.userId, email: member.email, name, avatar, role: member.role, joinedAt: member.joinedAt.toISOString(), lastActiveAt: member.lastActiveAt?.toISOString() ?? null, suspendedAt: member.suspendedAt?.toISOString() ?? null, invitedBy: actors.find(actor => actor.id === member.invitedBy)?.name || actors.find(actor => actor.id === member.invitedBy)?.email || null, groups: groups.filter(group => group.memberId === member.id).map(group => ({ id: group.id, name: group.name })) }))
  }

  async roster(id: string) {
    return this.present(await this.rows(id).orderBy(asc(workspaceMembers.joinedAt), asc(workspaceMembers.id)))
  }

  async directory(id: string, input: MemberQuery) {
    const search = `%${input.q.replaceAll('=', '==').replaceAll('%', '=%').replaceAll('_', '=_')}%`
    const where = and(eq(workspaceMembers.workspaceId, id), input.q ? or(sql`${workspaceMembers.email} LIKE ${search} ESCAPE '='`, sql`${users.name} LIKE ${search} ESCAPE '='`) : undefined, input.role ? eq(workspaceMembers.role, input.role as MemberItem['role']) : undefined, input.status === 'suspended' ? isNotNull(workspaceMembers.suspendedAt) : input.status === 'unregistered' ? and(isNull(workspaceMembers.userId), isNull(workspaceMembers.suspendedAt)) : input.status === 'active' ? and(isNotNull(workspaceMembers.userId), isNull(workspaceMembers.suspendedAt)) : undefined, input.groupId ? sql`exists (select 1 from ${groupMembers} where ${groupMembers.memberId} = ${workspaceMembers.id} and ${groupMembers.groupId} = ${input.groupId})` : undefined)
    const [rows, [total]] = await Promise.all([this.rows(id).where(and(where, input.cursor ? lt(workspaceMembers.id, input.cursor) : undefined)).orderBy(desc(workspaceMembers.id)).limit(51), this.db.select({ count: count() }).from(workspaceMembers).leftJoin(users, eq(users.id, workspaceMembers.userId)).where(where)])
    const items = await this.present(rows.slice(0, 50))
    return { items, total: total?.count ?? 0, nextCursor: rows.length > 50 ? items.at(-1)!.id : null }
  }

  async find(id: string, memberId: string) {
    const [item] = await this.present(await this.rows(id).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.id, memberId))).limit(1))
    return item ?? null
  }

  async add(id: string, actorId: string, input: MemberAddInput) {
    const results: MemberAddResult[] = []
    for (const email of input.emails) {
      try {
        const status = await this.db.transaction(async (tx) => {
          const { actor, workspace } = await this.gate(tx, id, actorId)
          if (!allowsWorkspaceAction(actor.role, workspace.settings ?? defaultWorkspaceSettings(), 'inviteMembers') || (input.role === 'admin' && actor.role !== 'owner') || (input.groupIds.length && actor.role !== 'owner')) {
            throw new ApplicationError('forbidden', 'Not allowed to add this member')
          }
          if (input.grants.length) {
            const scope = await loadResourceScope(tx, actorId, id)
            for (const grant of input.grants) {
              const resource = scope.resolved.get(grant.resourceId)
              if (!resource || resource.kind !== grant.kind || !scope.allowed(grant.kind).includes(grant.resourceId) || !resource.canManage) {
                throw new ApplicationError('forbidden', 'You cannot grant access to this resource')
              }
            }
          }
          const [exists] = await tx.select({ id: workspaceMembers.id }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.email, email)))
          if (exists) {
            return 'exists' as const
          }
          const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email))
          const [inviter] = await tx.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, actorId))
          const memberId = uuidv7()
          await tx.insert(workspaceMembers).values({ id: memberId, workspaceId: id, userId: user?.id ?? null, email, invitedBy: actorId, role: input.role })
          const groups = input.groupIds.length ? await tx.select({ id: memberGroups.id }).from(memberGroups).where(and(eq(memberGroups.workspaceId, id), inArray(memberGroups.id, input.groupIds))) : []
          if (groups.length !== input.groupIds.length) {
            throw new ApplicationError('invalid_input', 'Group belongs to another workspace')
          }
          if (groups.length) {
            await tx.insert(groupMembers).values(groups.map(group => ({ groupId: group.id, memberId })))
          }
          if (input.grants.length) {
            await tx.insert(resourceGrants).values(input.grants.map(grant => ({ workspaceId: id, pageId: grant.kind === 'page' ? grant.resourceId : null, folderId: grant.kind === 'folder' ? grant.resourceId : null, memberId, level: grant.level, expiresAt: grant.expiresAt ? new Date(grant.expiresAt) : null })))
          }
          const title = `You’ve been added to ${workspace.name}`
          if (user) {
            await tx.insert(notifications).values({ userId: user.id, workspaceId: id, kind: 'invitation', title, deduplicationKey: `member:${memberId}` })
          }
          if (this.emailEnabled) {
            await enqueueEmail(tx, { recipient: email, recipientUserId: user?.id ?? null, workspaceId: id, memberId, kind: 'invitation', title, deduplicationKey: `member:${memberId}`, activity: { actorName: inviter?.name || inviter?.email || 'Workspace owner', workspaceName: workspace.name, workspaceDescription: emailExcerpt(workspace.description, 600), role: input.role } })
          }
          await appendWorkspaceActivity(tx, id, actorId, 'member.added', email, { memberId })
          return 'added' as const
        })
        results.push({ email, status, message: status === 'added' ? 'Access added; no approval needed' : 'Already a workspace member' })
      } catch (cause) {
        results.push({ email, status: 'failed', message: cause instanceof ApplicationError ? cause.message : 'Unable to add this address' })
      }
    }
    return results
  }

  async change(id: string, memberId: string, actorId: string, input: Parameters<MemberRepository['change']>[3]) {
    await this.db.transaction(async (tx) => {
      const { actor } = await this.gate(tx, id, actorId)
      const [target] = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.id, memberId))).for('update')
      if (!target) {
        throw new ApplicationError('not_found', 'Member not found')
      }
      requireMemberManagement(actor.role, target.role, input.role)
      if (input.remove) {
        await tx.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId))
      } else {
        await tx.update(workspaceMembers).set({ ...(input.role ? { role: input.role } : {}), ...(input.suspended !== undefined ? { suspendedAt: input.suspended ? new Date() : null } : {}) }).where(eq(workspaceMembers.id, memberId))
      }
      await appendWorkspaceActivity(tx, id, actorId, input.remove ? 'member.removed' : input.role ? 'member.role_changed' : input.suspended ? 'member.suspended' : 'member.restored', `${target.email}${input.role ? `: ${input.role}` : ''}`, { memberId })
    })
  }

  async groups(id: string) {
    const rows = await this.db.select().from(memberGroups).where(eq(memberGroups.workspaceId, id)).orderBy(asc(memberGroups.name))
    const members = rows.length ? await this.db.select().from(groupMembers).where(inArray(groupMembers.groupId, rows.map(row => row.id))) : []
    return rows.map(row => ({ id: row.id, name: row.name, description: row.description, memberIds: members.filter(member => member.groupId === row.id).map(member => member.memberId) }))
  }

  async saveGroup(id: string, actorId: string, groupId: string | null, input: Omit<MemberGroup, 'id'>) {
    await this.db.transaction(async (tx) => {
      const { actor } = await this.gate(tx, id, actorId)
      if (actor.role !== 'owner') {
        throw new ApplicationError('forbidden', 'Only the owner can manage groups')
      }
      const members = input.memberIds.length ? await tx.select({ id: workspaceMembers.id }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, id), inArray(workspaceMembers.id, [...new Set(input.memberIds)]))) : []
      if (members.length !== new Set(input.memberIds).size) {
        throw new ApplicationError('invalid_input', 'Members must belong to this workspace')
      }
      const duplicate = await tx.select({ id: memberGroups.id }).from(memberGroups).where(and(eq(memberGroups.workspaceId, id), eq(memberGroups.name, input.name)))
      if (duplicate.some(group => group.id !== groupId)) {
        throw new ApplicationError('conflict', 'A group with this name already exists')
      }
      const target = groupId || uuidv7()
      if (groupId) {
        const [group] = await tx.select().from(memberGroups).where(and(eq(memberGroups.id, groupId), eq(memberGroups.workspaceId, id)))
        if (!group) {
          throw new ApplicationError('not_found', 'Group not found')
        }
        await tx.update(memberGroups).set({ name: input.name, description: input.description }).where(eq(memberGroups.id, groupId))
      } else {
        await tx.insert(memberGroups).values({ id: target, workspaceId: id, name: input.name, description: input.description })
      }
      const previous = await tx.select().from(groupMembers).where(eq(groupMembers.groupId, target))
      await tx.delete(groupMembers).where(eq(groupMembers.groupId, target))
      if (members.length) {
        await tx.insert(groupMembers).values(members.map(member => ({ groupId: target, memberId: member.id })))
      }
      const affected = [...new Set([...previous.map(member => member.memberId), ...members.map(member => member.id)])]
      await appendWorkspaceActivities(tx, id, actorId, affected.map(memberId => ({ action: 'group.updated', target: input.name, context: { memberId } })))
    })
  }

  async deleteGroup(id: string, actorId: string, groupId: string) {
    await this.db.transaction(async (tx) => {
      const { actor } = await this.gate(tx, id, actorId)
      if (actor.role !== 'owner') {
        throw new ApplicationError('forbidden', 'Only the owner can manage groups')
      }
      const [group] = await tx.select().from(memberGroups).where(and(eq(memberGroups.id, groupId), eq(memberGroups.workspaceId, id)))
      if (!group) {
        throw new ApplicationError('not_found', 'Group not found')
      }
      const members = await tx.select().from(groupMembers).where(eq(groupMembers.groupId, groupId))
      await tx.delete(memberGroups).where(eq(memberGroups.id, groupId))
      await appendWorkspaceActivities(tx, id, actorId, members.map(member => ({ action: 'group.deleted', target: group.name, context: { memberId: member.memberId } })))
    })
  }
}
