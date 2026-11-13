import type { ResourceAccess } from '../../access/domain/ResourceAccess'
import type { WorkspaceJournal } from '../../settings/domain/WorkspaceJournal'
import type { FolderChanges } from '../domain/Folder'
import type { FolderRepository } from '../domain/FolderRepository'
import type { WorkspaceAuthorization } from '../domain/WorkspaceAuthorization'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class FolderService {
  constructor(private readonly folders: FolderRepository, private readonly access: WorkspaceAuthorization, private readonly journal: WorkspaceJournal, private readonly resources: ResourceAccess) {}

  async list(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    const [folders, access] = await Promise.all([this.folders.list(workspaceId), this.resources.visible('folder', workspaceId, userId)])
    const levels = new Map(access.map(item => [item.id, item]))
    return folders.filter(folder => levels.has(folder.id)).map(folder => ({ ...folder, accessLevel: levels.get(folder.id)!.level, canManageAccess: levels.get(folder.id)!.canManage }))
  }

  async requireFolder(id: string, workspaceId: string) {
    const folder = await this.folders.find(id, workspaceId)
    if (!folder) {
      throw new ApplicationError('not_found', 'Folder not found in this workspace')
    }
    return folder
  }

  async create(workspaceId: string, name: string, userId: string) {
    await this.access.requireCapability(workspaceId, userId, 'createFolders')
    const folder = await this.folders.create(workspaceId, name)
    await this.journal.record(workspaceId, userId, 'folder.created', name, { folderId: folder.id })
    return { ...folder, accessLevel: 'edit' as const, canManageAccess: (await this.resources.visible('folder', workspaceId, userId)).find(item => item.id === folder.id)?.canManage ?? false }
  }

  async update(workspaceId: string, id: string, input: FolderChanges, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    await this.access.requireWritable(workspaceId, userId)
    await this.requireFolder(id, workspaceId)
    await this.resources.require('folder', id, userId, 'edit')
    await this.folders.update(id, workspaceId, input)
    const folder = await this.requireFolder(id, workspaceId)
    await this.journal.record(workspaceId, userId, 'folder.updated', folder.name, { folderId: id })
    return { ...folder, accessLevel: 'edit' as const, canManageAccess: (await this.resources.visible('folder', workspaceId, userId)).find(item => item.id === id)?.canManage ?? false }
  }

  async delete(workspaceId: string, id: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    await this.access.requireCapability(workspaceId, userId, 'deleteContent')
    const folder = await this.requireFolder(id, workspaceId)
    await this.resources.require('folder', id, userId, 'edit')
    await this.folders.delete(id, workspaceId)
    await this.journal.record(workspaceId, userId, 'folder.deleted', folder.name, { folderId: id })
  }
}
