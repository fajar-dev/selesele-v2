import type { LibraryRepository } from '../domain/LibraryRepository'
import type { ItemAccess } from '../../items/domain/ItemAccess'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'

export class LibraryService {
  constructor(private readonly repository: LibraryRepository, private readonly items: ItemAccess, private readonly access: WorkspaceAuthorization) {
  }

  async search(userId: string, query: string, workspaceId?: string) {
    if (workspaceId) {
      await this.access.requireMember(workspaceId, userId)
    }
    return this.repository.search(userId, query, workspaceId)
  }

  personal(userId: string) {
    return this.repository.personal(userId)
  }

  async favorite(userId: string, itemId: string, favorite: boolean) {
    await this.items.get(itemId, userId)
    await this.repository.favorite(userId, itemId, favorite)
  }

  async visit(userId: string, itemId: string) {
    await this.items.get(itemId, userId)
    await this.repository.visit(userId, itemId)
  }

  async backlinks(userId: string, itemId: string) {
    await this.items.get(itemId, userId)
    return this.repository.backlinks(userId, itemId)
  }

  async context(userId: string, question: string, workspaceId: string) {
    await this.access.requireMember(workspaceId, userId)
    return this.repository.context(userId, question, workspaceId)
  }
}
