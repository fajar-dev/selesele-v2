import type { FolderRepository } from '../domain/ports/FolderRepository'
import type { WorkspaceService } from './WorkspaceService'
import { ApplicationError } from '../domain/errors/ApplicationError'

export class FolderService {
  constructor(private readonly folders: FolderRepository, private readonly workspaces: WorkspaceService) {}

  async list(workspaceId: string, userId: string) {
    await this.workspaces.requireMember(workspaceId, userId)
    return this.folders.list(workspaceId)
  }

  async requireFolder(id: string, workspaceId: string) {
    const folder = await this.folders.find(id, workspaceId)
    if (!folder) {
      throw new ApplicationError(404, 'Folder not found in this workspace')
    }
    return folder
  }

  async create(workspaceId: string, name: string, userId: string) {
    await this.workspaces.requireMember(workspaceId, userId)
    return this.folders.create(workspaceId, name)
  }

  async rename(workspaceId: string, id: string, name: string, userId: string) {
    await this.workspaces.requireMember(workspaceId, userId)
    await this.requireFolder(id, workspaceId)
    await this.folders.rename(id, workspaceId, name)
  }

  async delete(workspaceId: string, id: string, userId: string) {
    await this.workspaces.requireMember(workspaceId, userId)
    await this.requireFolder(id, workspaceId)
    await this.folders.delete(id, workspaceId)
  }
}
