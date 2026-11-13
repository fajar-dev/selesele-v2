import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { MemberRepository, MemberQuery } from '../domain/MemberRepository'
import type { MemberAddInput, MemberBulkAction } from '../../../../shared/kernel/member'
import type { InviteRole } from '../../../../shared/kernel/workspace'
import type { ResourceAccess } from '../../access/domain/ResourceAccess'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class MemberService {
  constructor(private readonly repository: MemberRepository, private readonly access: WorkspaceAuthorization, private readonly resources: ResourceAccess) { }
  async roster(id: string, userId: string) {
    await this.access.requireMember(id, userId)
    return this.repository.roster(id)
  }

  async directory(id: string, userId: string, query: MemberQuery) {
    await this.access.requireMember(id, userId)
    return this.repository.directory(id, query)
  }

  async detail(id: string, userId: string, memberId: string) {
    await this.access.requireManager(id, userId)
    const member = await this.repository.find(id, memberId)
    if (!member) {
      throw new ApplicationError('not_found', 'Member not found')
    }
    return member
  }

  async add(id: string, userId: string, input: MemberAddInput) {
    const actor = await this.access.requireCapability(id, userId, 'inviteMembers')
    if (actor.role !== 'owner' && input.role === 'admin') {
      throw new ApplicationError('forbidden', 'Only the owner can appoint admins')
    }
    if (actor.role !== 'owner' && input.groupIds.length) {
      throw new ApplicationError('forbidden', 'Only the owner can assign groups')
    }
    for (const grant of input.grants) {
      const policy = await this.resources.policy(grant.kind, grant.resourceId, userId)
      if (policy.workspaceId !== id) {
        throw new ApplicationError('invalid_input', 'Resource belongs to another workspace')
      }
    }
    return this.repository.add(id, userId, { ...input, emails: [...new Set(input.emails)] })
  }

  async change(id: string, userId: string, memberId: string, input: Parameters<MemberRepository['change']>[3]) {
    await this.access.requireManager(id, userId)
    await this.access.requireWritable(id, userId)
    await this.repository.change(id, memberId, userId, input)
  }

  async bulk(id: string, userId: string, input: {
    memberIds: string[]
    action: MemberBulkAction
    role?: InviteRole
  }) {
    await this.access.requireManager(id, userId)
    const results: {
      memberId: string
      success: boolean
      message: string
    }[] = []
    for (const memberId of [...new Set(input.memberIds)]) {
      try {
        await this.change(id, userId, memberId, input.action === 'remove' ? { remove: true } : input.action === 'role' ? { role: input.role! } : { suspended: input.action === 'suspend' })
        results.push({ memberId, success: true, message: 'Updated' })
      } catch (cause) {
        results.push({ memberId, success: false, message: cause instanceof ApplicationError ? cause.message : 'Unable to update this member' })
      }
    }
    return results
  }

  async groups(id: string, userId: string) {
    await this.access.requireMember(id, userId)
    return this.repository.groups(id)
  }

  async saveGroup(id: string, userId: string, groupId: string | null, input: Parameters<MemberRepository['saveGroup']>[3]) {
    await this.access.requireOwner(id, userId)
    await this.access.requireWritable(id, userId)
    await this.repository.saveGroup(id, userId, groupId, input)
  }

  async deleteGroup(id: string, userId: string, groupId: string) {
    await this.access.requireOwner(id, userId)
    await this.access.requireWritable(id, userId)
    await this.repository.deleteGroup(id, userId, groupId)
  }
}
