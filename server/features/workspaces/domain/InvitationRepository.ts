import type { InviteRole } from '../../../../shared/kernel/workspace'
import type { Invitation } from './Invitation'

export interface InvitationRepository {
  invite(workspaceId: string, email: string, role: InviteRole, invitedBy: string): Promise<void>
  invitations(workspaceId: string): Promise<Invitation[]>
  inbox(email: string): Promise<Invitation[]>
  accept(invitationId: string, userId: string, email: string): Promise<string | null>
  decline(invitationId: string, email: string): Promise<void>
  cancelInvitation(workspaceId: string, invitationId: string): Promise<void>
}
