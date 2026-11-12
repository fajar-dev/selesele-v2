import type { WorkspaceRepository, WorkspaceDraft, WorkspaceChanges } from '../domain/WorkspaceRepository'
import type { WorkspaceAuthorization } from '../domain/WorkspaceAuthorization'

export class WorkspaceService {
  constructor(private readonly workspaces: WorkspaceRepository, private readonly access: WorkspaceAuthorization) {}

  get(id: string, userId: string) {
    return this.access.requireMember(id, userId)
  }

  list(userId: string) {
    return this.workspaces.list(userId)
  }

  async create(input: WorkspaceDraft, userId: string) {
    const workspace = await this.workspaces.create(input, userId)
    return this.access.requireMember(workspace.id, userId)
  }

  async update(id: string, input: WorkspaceChanges, userId: string) {
    await this.access.requireManager(id, userId)
    await this.workspaces.update(id, input)
    return this.access.requireMember(id, userId)
  }

  async delete(id: string, userId: string) {
    await this.access.requireOwner(id, userId)
    await this.workspaces.delete(id)
  }
}
