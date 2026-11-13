import type { ResourceAccess } from '../../access/domain/ResourceAccess'
import type { WorkspaceJournal } from '../../settings/domain/WorkspaceJournal'
import type { PageDraft, PageChanges } from '../domain/Page'
import type { PageRepository } from '../domain/PageRepository'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { FolderLookup } from '../../workspaces/domain/FolderLookup'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class PageService {
  constructor(private readonly pages: PageRepository, private readonly access: WorkspaceAuthorization, private readonly folders: FolderLookup, private readonly journal: WorkspaceJournal, private readonly resources: ResourceAccess) { }
  async list(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    const [pages, access] = await Promise.all([this.pages.list(workspaceId), this.resources.visible('page', workspaceId, userId)])
    const levels = new Map(access.map(item => [item.id, item]))
    return pages.filter(page => levels.has(page.id)).map(page => ({ ...page, accessLevel: levels.get(page.id)!.level, canManageAccess: levels.get(page.id)!.canManage }))
  }

  async get(id: string, userId: string) {
    const page = await this.pages.find(id)
    if (!page) {
      throw new ApplicationError('not_found', 'Page not found')
    }
    const accessLevel = await this.resources.require('page', id, userId, 'view')
    const workspace = await this.access.requireMember(page.workspaceId, userId)
    return { ...page, accessLevel, canManageAccess: workspace.role === 'owner' || (workspace.role === 'admin' && accessLevel === 'edit') }
  }

  async writable(id: string, userId: string) {
    const page = await this.get(id, userId)
    if (page.archivedAt) {
      throw new ApplicationError('forbidden', 'This page is archived and read-only')
    }
    await this.access.requireWritable(page.workspaceId, userId)
    await this.resources.require('page', id, userId, 'edit')
    return page
  }

  async commentable(id: string, userId: string) {
    const page = await this.get(id, userId)
    if (page.archivedAt) {
      throw new ApplicationError('forbidden', 'This page is archived and read-only')
    }
    await this.access.requireWritable(page.workspaceId, userId)
    await this.resources.require('page', id, userId, 'comment')
    return page
  }

  async create(workspaceId: string, input: PageDraft, userId: string, content = '') {
    await this.access.requireCapability(workspaceId, userId, 'createPages')
    if (input.folderId) {
      await this.folders.requireFolder(input.folderId, workspaceId)
      await this.resources.require('folder', input.folderId, userId, 'edit')
    }
    const page = await this.pages.create(workspaceId, input, userId, content)
    await this.journal.record(workspaceId, userId, 'page.created', page.title, { pageId: page.id })
    return this.get(page.id, userId)
  }

  async update(id: string, input: PageChanges, userId: string) {
    const page = await this.writable(id, userId)
    await this.pages.update(id, input)
    await this.journal.record(page.workspaceId, userId, 'page.updated', input.title || page.title, { pageId: id })
    return this.get(id, userId)
  }

  async previewMove(id: string, folderId: string | null, userId: string) {
    await this.writable(id, userId)
    return this.resources.previewMove(id, folderId, userId)
  }

  async move(id: string, folderId: string | null, userId: string, acknowledgement?: string) {
    const page = await this.writable(id, userId)
    if (folderId) {
      await this.folders.requireFolder(folderId, page.workspaceId)
      await this.resources.require('folder', folderId, userId, 'edit')
    }
    await this.resources.movePage(id, folderId, userId, acknowledgement)
    return this.get(id, userId)
  }

  async delete(id: string, userId: string) {
    const page = await this.writable(id, userId)
    await this.access.requireCapability(page.workspaceId, userId, 'deleteContent')
    await this.pages.delete(id)
    await this.journal.record(page.workspaceId, userId, 'page.deleted', page.title, { pageId: id })
  }

  async archive(id: string, archived: boolean, userId: string) {
    const page = await this.get(id, userId)
    await this.access.requireCapability(page.workspaceId, userId, 'deleteContent')
    await this.resources.require('page', id, userId, 'edit')
    await this.pages.archive(id, archived)
    await this.journal.record(page.workspaceId, userId, archived ? 'page.archived' : 'page.unarchived', page.title, { pageId: id })
    return this.get(id, userId)
  }
}
