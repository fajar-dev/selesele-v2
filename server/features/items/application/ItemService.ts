import type { ResourceAccess } from '../../access/domain/ResourceAccess'
import type { WorkspaceJournal } from '../../settings/domain/WorkspaceJournal'
import type { ItemDraft, ItemChanges } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { FolderLookup } from '../../workspaces/domain/FolderLookup'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class ItemService {
  constructor(private readonly items: ItemRepository, private readonly access: WorkspaceAuthorization, private readonly folders: FolderLookup, private readonly journal: WorkspaceJournal, private readonly resources: ResourceAccess) {
  }

  async list(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    const [items, access] = await Promise.all([this.items.list(workspaceId), this.resources.visible('item', workspaceId, userId)])
    const levels = new Map(access.map(item => [item.id, item]))
    return items.filter(item => levels.has(item.id)).map(item => ({ ...item, accessLevel: levels.get(item.id)!.level, canManageAccess: levels.get(item.id)!.canManage }))
  }

  async get(id: string, userId: string) {
    const item = await this.items.find(id)
    if (!item) {
      throw new ApplicationError('not_found', 'Item not found')
    }
    const accessLevel = await this.resources.require('item', id, userId, 'view')
    const workspace = await this.access.requireMember(item.workspaceId, userId)
    return { ...item, accessLevel, canManageAccess: workspace.role === 'owner' || (workspace.role === 'admin' && accessLevel === 'edit') }
  }

  async writable(id: string, userId: string) {
    const item = await this.get(id, userId)
    if (item.archivedAt) {
      throw new ApplicationError('forbidden', 'This item is archived and read-only')
    }
    await this.access.requireWritable(item.workspaceId, userId)
    await this.resources.require('item', id, userId, 'edit')
    return item
  }

  async commentable(id: string, userId: string) {
    const item = await this.get(id, userId)
    if (item.archivedAt) {
      throw new ApplicationError('forbidden', 'This item is archived and read-only')
    }
    await this.access.requireWritable(item.workspaceId, userId)
    await this.resources.require('item', id, userId, 'comment')
    return item
  }

  async create(workspaceId: string, input: ItemDraft, userId: string, content = '') {
    await this.access.requireCapability(workspaceId, userId, 'createItems')
    if (input.folderId) {
      await this.folders.requireFolder(input.folderId, workspaceId)
      await this.resources.require('folder', input.folderId, userId, 'edit')
    }
    const item = await this.items.create(workspaceId, input, userId, content)
    await this.journal.record(workspaceId, userId, 'item.created', item.title, { itemId: item.id })
    return this.get(item.id, userId)
  }

  async update(id: string, input: ItemChanges, userId: string) {
    const item = await this.writable(id, userId)
    await this.items.update(id, input)
    await this.journal.record(item.workspaceId, userId, 'item.updated', input.title || item.title, { itemId: id })
    return this.get(id, userId)
  }

  async previewMove(id: string, folderId: string | null, userId: string) {
    await this.writable(id, userId)
    return this.resources.previewMove(id, folderId, userId)
  }

  async move(id: string, folderId: string | null, userId: string, acknowledgement?: string) {
    const item = await this.writable(id, userId)
    if (folderId) {
      await this.folders.requireFolder(folderId, item.workspaceId)
      await this.resources.require('folder', folderId, userId, 'edit')
    }
    await this.resources.moveItem(id, folderId, userId, acknowledgement)
    return this.get(id, userId)
  }

  async delete(id: string, userId: string) {
    const item = await this.writable(id, userId)
    await this.access.requireCapability(item.workspaceId, userId, 'deleteContent')
    await this.items.delete(id)
    await this.journal.record(item.workspaceId, userId, 'item.deleted', item.title, { itemId: id })
  }

  async archive(id: string, archived: boolean, userId: string) {
    const item = await this.get(id, userId)
    await this.access.requireCapability(item.workspaceId, userId, 'deleteContent')
    await this.resources.require('item', id, userId, 'edit')
    await this.items.archive(id, archived)
    await this.journal.record(item.workspaceId, userId, archived ? 'item.archived' : 'item.unarchived', item.title, { itemId: id })
    return this.get(id, userId)
  }
}
