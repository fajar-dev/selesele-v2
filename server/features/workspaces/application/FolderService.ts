import type { FolderChanges } from '../domain/Folder'
import type { FolderRepository } from '../domain/FolderRepository'
import type { WorkspaceAuthorization } from '../domain/WorkspaceAuthorization'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class FolderService {
  constructor(private readonly folders: FolderRepository, private readonly access: WorkspaceAuthorization) {}

  async list(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    return this.folders.list(workspaceId)
  }

  async requireFolder(id: string, workspaceId: string) {
    const folder = await this.folders.find(id, workspaceId)
    if (!folder) {
      throw new ApplicationError('not_found', 'Folder not found in this workspace')
    }
    return folder
  }

  async create(workspaceId: string, name: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    return this.folders.create(workspaceId, name)
  }

  async update(workspaceId: string, id: string, input: FolderChanges, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    await this.requireFolder(id, workspaceId)
    await this.folders.update(id, workspaceId, input)
    return this.requireFolder(id, workspaceId)
  }

  async delete(workspaceId: string, id: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    await this.requireFolder(id, workspaceId)
    await this.folders.delete(id, workspaceId)
  }
}
