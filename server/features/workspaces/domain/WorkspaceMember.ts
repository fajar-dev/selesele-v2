import type { IdentityProfile } from '../../../../shared/kernel/identity'
import type { WorkspaceRole } from '../../../../shared/kernel/workspace'

export interface WorkspaceMember extends Omit<IdentityProfile, 'id'> {
  userId: string
  role: WorkspaceRole
}
