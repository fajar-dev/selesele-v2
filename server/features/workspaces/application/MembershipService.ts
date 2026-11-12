import type { MembershipRepository } from '../domain/MembershipRepository'
import type { WorkspaceAuthorization } from '../domain/WorkspaceAuthorization'
import type { InviteRole } from '../../../../shared/kernel/workspace'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class MembershipService {
  constructor(private readonly members: MembershipRepository, private readonly access: WorkspaceAuthorization) {}

  async list(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    return this.members.members(workspaceId)
  }

  async changeRole(workspaceId: string, targetId: string, role: InviteRole, userId: string) {
    await this.access.requireManager(workspaceId, userId)
    const member = await this.members.member(workspaceId, targetId)
    if (!member) {
      throw new ApplicationError('not_found', 'Member not found')
    }
    if (member.role === 'owner') {
      throw new ApplicationError('conflict', 'The workspace owner cannot be changed')
    }
    if (!await this.members.changeRole(workspaceId, targetId, role)) {
      throw new ApplicationError('conflict', 'Membership changed. Reload and try again.')
    }
  }

  async remove(workspaceId: string, targetId: string, userId: string) {
    await this.access.requireManager(workspaceId, userId)
    const member = await this.members.member(workspaceId, targetId)
    if (member?.role === 'owner') {
      throw new ApplicationError('conflict', 'The workspace owner cannot be removed')
    }
    if (!member || !await this.members.removeMember(workspaceId, targetId)) {
      throw new ApplicationError('not_found', 'Member not found')
    }
  }
}
