import type { WorkspaceSettings } from '../../../../shared/kernel/workspaceSettings'
import type { WorkspaceRole } from '../../../../shared/kernel/workspace'

export interface Workspace {
  id: string
  name: string
  description: string
  icon: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  archivedAt: Date | null
  settings: WorkspaceSettings
}

export interface WorkspaceAccess extends Workspace {
  role: WorkspaceRole
}
