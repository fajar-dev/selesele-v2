import type { PageRepository } from '../domain/ports/PageRepository'
import type { DocumentRepository } from '../domain/ports/DocumentRepository'
import type { PageInput, PageUpdate } from '../../shared/types/page'
import type { WorkspaceService } from './WorkspaceService'
import type { FolderService } from './FolderService'
import { ApplicationError } from '../domain/errors/ApplicationError'

export class PageService {
  constructor(private readonly pages: PageRepository, private readonly documents: DocumentRepository,
    private readonly workspaces: WorkspaceService, private readonly folders: FolderService) {}

  async list(workspaceId: string, userId: string) {
    await this.workspaces.requireMember(workspaceId, userId)
    return this.pages.list(workspaceId)
  }

  async get(id: string, userId: string) {
    const page = await this.pages.find(id)
    if (!page) {
      throw new ApplicationError(404, 'Page not found')
    }
    await this.workspaces.requireMember(page.workspaceId, userId)
    return page
  }

  async create(workspaceId: string, input: PageInput, userId: string) {
    await this.workspaces.requireMember(workspaceId, userId)
    if (input.folderId) {
      await this.folders.requireFolder(input.folderId, workspaceId)
    }
    return this.pages.create(workspaceId, input, userId)
  }

  async update(id: string, input: PageUpdate, userId: string) {
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
