import type { WorkspaceAccess } from './Workspace'

export interface WorkspaceAuthorization {
  requireMember(workspaceId: string, userId: string): Promise<WorkspaceAccess>
  requireManager(workspaceId: string, userId: string): Promise<WorkspaceAccess>
  requireOwner(workspaceId: string, userId: string): Promise<WorkspaceAccess>
}
