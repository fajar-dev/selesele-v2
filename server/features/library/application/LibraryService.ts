import type { LibraryRepository } from '../domain/LibraryRepository'
import type { PageAccess } from '../../pages/domain/PageAccess'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'

export class LibraryService {
  constructor(private readonly repository: LibraryRepository, private readonly pages: PageAccess, private readonly access: WorkspaceAuthorization) {}
  async search(userId: string, query: string, workspaceId?: string) {
    if (workspaceId) {
      await this.access.requireMember(workspaceId, userId)
    }
    return this.repository.search(userId, query, workspaceId)
  }

  personal(userId: string) {
    return this.repository.personal(userId)
  }

  async favorite(userId: string, pageId: string, favorite: boolean) {
    await this.pages.get(pageId, userId)
    await this.repository.favorite(userId, pageId, favorite)
  }

  async visit(userId: string, pageId: string) {
    await this.pages.get(pageId, userId)
    await this.repository.visit(userId, pageId)
  }

  async backlinks(userId: string, pageId: string) {
    await this.pages.get(pageId, userId)
    return this.repository.backlinks(userId, pageId)
  }

  async context(userId: string, question: string, workspaceId: string) {
    await this.access.requireMember(workspaceId, userId)
    return this.repository.context(userId, question, workspaceId)
  }
}
