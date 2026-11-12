import type { InviteRole } from '../../../../shared/kernel/workspace'
import type { WorkspaceMember } from './WorkspaceMember'

export interface MembershipRepository {
  members(workspaceId: string): Promise<WorkspaceMember[]>
  member(workspaceId: string, userId: string): Promise<WorkspaceMember | null>
  memberByEmail(workspaceId: string, email: string): Promise<WorkspaceMember | null>
  changeRole(workspaceId: string, userId: string, role: InviteRole): Promise<boolean>
  removeMember(workspaceId: string, userId: string): Promise<boolean>
}
