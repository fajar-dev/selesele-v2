import type { RecoveryRepository } from '../domain/RecoveryRepository'
import type { PageAccess } from '../../pages/domain/PageAccess'
import type { DocumentEditor } from '../../pages/domain/DocumentEditor'
import type { TrashKind } from '../../../../shared/contracts/recovery'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class RecoveryService {
  constructor(private readonly repository: RecoveryRepository, private readonly pages: PageAccess, private readonly editor: DocumentEditor) {}
  trash(userId: string) {
    return this.repository.trash(userId)
  }

  private async item(userId: string, kind: TrashKind, id: string) {
    const item = await this.repository.findTrashed(userId, kind, id)
    if (!item) {
      throw new ApplicationError('not_found', 'Trashed item not found')
    }
    return item
  }

  async restore(userId: string, kind: TrashKind, id: string) {
    await this.item(userId, kind, id)
    await this.repository.restore(kind, id)
  }

  async purge(userId: string, kind: TrashKind, id: string) {
    const item = await this.item(userId, kind, id)
    if (!item.canPurge) {
      throw new ApplicationError('forbidden', 'Only workspace managers can permanently delete items')
    }
    await this.repository.purge(kind, id)
  }

  async versions(userId: string, pageId: string) {
    await this.pages.get(pageId, userId)
    return this.repository.versions(pageId)
  }

  async version(userId: string, pageId: string, id: string) {
    await this.pages.get(pageId, userId)
    const content = await this.repository.version(pageId, id)
    if (content === null) {
      throw new ApplicationError('not_found', 'Version not found')
    }
    return { content }
  }

  async checkpoint(userId: string, pageId: string) {
    await this.pages.get(pageId, userId)
    await this.repository.checkpoint(pageId, userId)
  }

  async restoreVersion(userId: string, pageId: string, id: string) {
    const { content } = await this.version(userId, pageId, id)
    await this.editor.replaceMarkdown(pageId, content, userId)
  }
}
