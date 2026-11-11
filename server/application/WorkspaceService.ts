import type { WorkspaceRepository } from '../domain/ports/WorkspaceRepository'
import type { InviteRole } from '../../shared/types/workspace'
import type { User } from '../../shared/types/auth'
import { ApplicationError } from '../domain/errors/ApplicationError'

export class WorkspaceService {
  constructor(private readonly workspaces: WorkspaceRepository) {}

  list(userId: string) {
    return this.workspaces.list(userId)
  }

  async create(input: { name: string, icon: string }, userId: string) {
    const workspace = await this.workspaces.create(input, userId)
    return this.requireMember(workspace.id, userId)
  }

  async requireMember(id: string, userId: string) {
    const workspace = await this.workspaces.access(id, userId)
    if (!workspace) {
      throw new ApplicationError(404, 'Workspace not found')
    }
    return workspace
  }

  async requireManager(id: string, userId: string) {
    const workspace = await this.requireMember(id, userId)
    if (workspace.role === 'member') {
      throw new ApplicationError(403, 'Only workspace owners and admins can manage members and settings')
    }
    return workspace
  }

  async update(id: string, input: { name?: string, icon?: string }, userId: string) {
    await this.requireManager(id, userId)
    await this.workspaces.update(id, input)
    return this.requireMember(id, userId)
  }

  async delete(id: string, userId: string) {
    const workspace = await this.requireMember(id, userId)
    if (workspace.role !== 'owner') {
      throw new ApplicationError(403, 'Only the workspace owner can delete it')
    }
    await this.workspaces.delete(id)
  }

  async members(id: string, userId: string) {
    await this.requireMember(id, userId)
    return this.workspaces.members(id)
  }

  async changeRole(id: string, targetId: string, role: InviteRole, userId: string) {
    await this.requireManager(id, userId)
    const members = await this.workspaces.members(id)
    const target = members.find(member => member.userId === targetId)
    if (!target) {
      throw new ApplicationError(404, 'Member not found')
    }
    if (target.role === 'owner') {
      throw new ApplicationError(409, 'The workspace owner cannot be changed')
    }
    if (!await this.workspaces.changeRole(id, targetId, role)) {
      throw new ApplicationError(409, 'Membership changed. Refresh and try again.')
    }
  }

  async removeMember(id: string, targetId: string, userId: string) {
    await this.requireManager(id, userId)
    const members = await this.workspaces.members(id)
    if (members.find(member => member.userId === targetId)?.role === 'owner') {
      throw new ApplicationError(409, 'The workspace owner cannot be removed')
    }
    if (!await this.workspaces.removeMember(id, targetId)) {
      throw new ApplicationError(404, 'Member not found')
    }
  }

  async invite(id: string, email: string, role: InviteRole, userId: string) {
    await this.requireManager(id, userId)
    const members = await this.workspaces.members(id)
    if (members.some(member => member.email === email)) {
      throw new ApplicationError(409, 'This person is already a workspace member')
    }
    await this.workspaces.invite(id, email, role, userId)
  }

  async invitations(id: string, userId: string) {
    await this.requireManager(id, userId)
    return this.workspaces.invitations(id)
  }

  inbox(email: string) {
    return this.workspaces.inbox(email)
  }

  async accept(invitationId: string, user: User) {
    const id = await this.workspaces.accept(invitationId, user.id, user.email)
    if (!id) {
      throw new ApplicationError(404, 'Invitation not found or expired')
    }
    return { workspaceId: id }
  }

  decline(invitationId: string, email: string) {
    return this.workspaces.decline(invitationId, email)
  }

  async cancelInvitation(id: string, invitationId: string, userId: string) {
    await this.requireManager(id, userId)
    await this.workspaces.cancelInvitation(id, invitationId)
  }
}
