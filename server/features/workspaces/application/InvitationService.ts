import type { ActivityPublisher } from '../../notifications/domain/ActivityPublisher'
import type { InvitationRepository } from '../domain/InvitationRepository'
import type { MembershipRepository } from '../domain/MembershipRepository'
import type { WorkspaceAuthorization } from '../domain/WorkspaceAuthorization'
import type { IdentityProfile } from '../../../../shared/kernel/identity'
import type { InviteRole } from '../../../../shared/kernel/workspace'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class InvitationService {
  constructor(private readonly invitations: InvitationRepository, private readonly members: MembershipRepository, private readonly access: WorkspaceAuthorization, private readonly activity: ActivityPublisher) {}

  async invite(workspaceId: string, email: string, role: InviteRole, userId: string) {
    await this.access.requireManager(workspaceId, userId)
    if (await this.members.memberByEmail(workspaceId, email)) {
      throw new ApplicationError('conflict', 'This person is already a workspace member')
    }
    await this.invitations.invite(workspaceId, email, role, userId)
    await this.activity.invitation(workspaceId, email, userId)
  }

  async list(workspaceId: string, userId: string) {
    await this.access.requireManager(workspaceId, userId)
    return this.invitations.invitations(workspaceId)
  }

  inbox(email: string) {
    return this.invitations.inbox(email)
  }

  async accept(invitationId: string, user: IdentityProfile) {
    const workspaceId = await this.invitations.accept(invitationId, user.id, user.email)
    if (!workspaceId) {
      throw new ApplicationError('not_found', 'Invitation not found or expired')
    }
    return { workspaceId }
  }

  decline(invitationId: string, email: string) {
    return this.invitations.decline(invitationId, email)
  }

  async cancel(workspaceId: string, invitationId: string, userId: string) {
    await this.access.requireManager(workspaceId, userId)
    await this.invitations.cancelInvitation(workspaceId, invitationId)
  }
}
