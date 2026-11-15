import type { WorkspaceCapability } from '../../../../shared/model/workspaceSettings'
import type { WorkspaceAccess } from './Workspace'

export interface WorkspaceAuthorization {
  requireWritable(workspaceId: string, userId: string): Promise<WorkspaceAccess>
  requireCapability(workspaceId: string, userId: string, capability: WorkspaceCapability): Promise<WorkspaceAccess>
  requireMember(workspaceId: string, userId: string): Promise<WorkspaceAccess>
  requireManager(workspaceId: string, userId: string): Promise<WorkspaceAccess>
  requireOwner(workspaceId: string, userId: string): Promise<WorkspaceAccess>
}
