import type { WorkspaceRole } from '../../../../shared/kernel/workspace'

export interface Workspace {
  id: string
  name: string
  icon: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface WorkspaceAccess extends Workspace {
  role: WorkspaceRole
}
