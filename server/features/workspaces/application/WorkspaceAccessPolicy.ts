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

  async requireManager(id: string, userId: string) {
    const workspace = await this.requireMember(id, userId)
    if (workspace.role === 'member') {
      throw new ApplicationError('forbidden', 'Only workspace owners and admins can manage members and settings')
    }
    return workspace
  }

  async requireOwner(id: string, userId: string) {
    const workspace = await this.requireMember(id, userId)
    if (workspace.role !== 'owner') {
      throw new ApplicationError('forbidden', 'Only the workspace owner can delete it')
    }
    return workspace
  }
}
