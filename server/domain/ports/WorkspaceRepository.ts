import type { Workspace, WorkspaceAccess } from '../entities/Workspace'
import type { Invitation } from '../entities/Invitation'
import type { InviteRole, WorkspaceMember } from '../../../shared/types/workspace'

export interface WorkspaceRepository {
  list(userId: string): Promise<WorkspaceAccess[]>
  access(id: string, userId: string): Promise<WorkspaceAccess | null>
  create(input: { name: string, icon: string }, userId: string): Promise<Workspace>
  update(id: string, input: { name?: string, icon?: string }): Promise<void>
  delete(id: string): Promise<void>
  members(id: string): Promise<WorkspaceMember[]>
  changeRole(id: string, userId: string, role: InviteRole): Promise<boolean>
  removeMember(id: string, userId: string): Promise<boolean>
  invite(id: string, email: string, role: InviteRole, invitedBy: string): Promise<void>
  invitations(id: string): Promise<Invitation[]>
  inbox(email: string): Promise<Invitation[]>
  accept(invitationId: string, userId: string, email: string): Promise<string | null>
  decline(invitationId: string, email: string): Promise<void>
  cancelInvitation(id: string, invitationId: string): Promise<void>
}
