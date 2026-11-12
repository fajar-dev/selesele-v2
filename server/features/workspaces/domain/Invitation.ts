import type { InviteRole } from '../../../../shared/kernel/workspace'

export interface Invitation {
  id: string
  workspaceId: string
  workspaceName: string
  email: string
  role: InviteRole
  expiresAt: Date
}
