import type { PageDraft, PageChanges } from '../domain/Page'
import type { PageRepository } from '../domain/PageRepository'
import type { DocumentRepository } from '../domain/DocumentRepository'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { FolderLookup } from '../../workspaces/domain/FolderLookup'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class PageService {
  constructor(private readonly pages: PageRepository, private readonly documents: DocumentRepository,
    private readonly access: WorkspaceAuthorization, private readonly folders: FolderLookup) {}

  async list(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    return this.pages.list(workspaceId)
  }

  async get(id: string, userId: string) {
    const page = await this.pages.find(id)
    if (!page) {
      throw new ApplicationError('not_found', 'Page not found')
    }
    await this.access.requireMember(page.workspaceId, userId)
    return page
  }

  async create(workspaceId: string, input: PageDraft, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    if (input.folderId) {
      await this.folders.requireFolder(input.folderId, workspaceId)
    }
    return this.pages.create(workspaceId, input, userId)
  }

  async update(id: string, input: PageChanges, userId: string) {
    await this.get(id, userId)
    await this.pages.update(id, input)
    return this.get(id, userId)
  }

  async move(id: string, folderId: string | null, userId: string) {
    const page = await this.get(id, userId)
    if (folderId) {
      await this.folders.requireFolder(folderId, page.workspaceId)
    }
    await this.pages.move(id, folderId)
    return this.get(id, userId)
  }

  async delete(id: string, userId: string) {
    await this.get(id, userId)
    await this.pages.delete(id)
  }

  async content(id: string, userId: string) {
    await this.get(id, userId)
    return this.documents.readContent(id)
  }

  async updateContent(id: string, content: string, userId: string) {
    await this.get(id, userId)
    await this.documents.updateContent(id, content)
  }
}
