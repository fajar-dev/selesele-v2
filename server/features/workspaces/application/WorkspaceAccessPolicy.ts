import { allowsWorkspaceAction, type WorkspaceCapability } from '../../../../shared/kernel/workspaceSettings'
import type { WorkspaceRepository } from '../domain/WorkspaceRepository'
import type { WorkspaceAuthorization } from '../domain/WorkspaceAuthorization'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class WorkspaceAccessPolicy implements WorkspaceAuthorization {
  constructor(private readonly workspaces: WorkspaceRepository) {}

  async requireMember(id: string, userId: string) {
    const workspace = await this.workspaces.access(id, userId)
    if (!workspace) {
      throw new ApplicationError('not_found', 'Workspace not found')
    }
    return workspace
  }

  async requireWritable(id: string, userId: string) {
    const workspace = await this.requireMember(id, userId)
    if (workspace.role === 'viewer') {
      throw new ApplicationError('forbidden', 'Workspace viewers cannot modify content')
    }
    if (workspace.archivedAt) {
      throw new ApplicationError('forbidden', 'This workspace is archived and read-only')
    }
    return workspace
  }

  async requireCapability(id: string, userId: string, capability: WorkspaceCapability) {
    const workspace = await this.requireWritable(id, userId)
    if (!allowsWorkspaceAction(workspace.role, workspace.settings, capability)) {
      throw new ApplicationError('forbidden', 'Workspace permissions restrict this action to owners and admins')
    }
    return workspace
  }

  async requireManager(id: string, userId: string) {
    const workspace = await this.requireMember(id, userId)
    if (workspace.role !== 'owner' && workspace.role !== 'admin') {
      throw new ApplicationError('forbidden', 'Only workspace owners and admins can manage members and settings')
    }
    return workspace
  }

  async requireOwner(id: string, userId: string) {
    const workspace = await this.requireMember(id, userId)
    if (workspace.role !== 'owner') {
      throw new ApplicationError('forbidden', 'Only the workspace owner can perform this action')
    }
    return workspace
  }
}
