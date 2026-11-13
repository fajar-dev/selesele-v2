import type { CanvasEditor } from '../../canvases/domain/CanvasRepository'
import type { WorkspaceJournal } from '../../settings/domain/WorkspaceJournal'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { RecoveryRepository } from '../domain/RecoveryRepository'
import type { ItemAccess } from '../../items/domain/ItemAccess'
import type { DocumentEditor } from '../../items/domain/DocumentEditor'
import type { TrashKind } from '../../../../shared/contracts/recovery'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class RecoveryService {
  constructor(private readonly repository: RecoveryRepository, private readonly items: ItemAccess, private readonly editor: DocumentEditor, private readonly access: WorkspaceAuthorization, private readonly journal: WorkspaceJournal, private readonly canvases?: CanvasEditor) {
  }

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
    const item = await this.item(userId, kind, id)
    if (kind !== 'workspace') {
      await this.access.requireWritable(item.workspaceId, userId)
    }
    if (!item.canRestore) {
      throw new ApplicationError('forbidden', 'Edit access is required to restore this document')
    }
    await this.repository.restore(kind, id)
    await this.journal.record(item.workspaceId, userId, 'content.restored', item.title, { itemId: kind === 'item' ? id : undefined, folderId: kind === 'folder' ? id : undefined })
  }

  async purge(userId: string, kind: TrashKind, id: string) {
    const item = await this.item(userId, kind, id)
    if (!item.canPurge) {
      throw new ApplicationError('forbidden', 'Only workspace managers can permanently delete items')
    }
    if (kind !== 'workspace') {
      await this.access.requireWritable(item.workspaceId, userId)
    }
    if (!await this.repository.purge(kind, id)) {
      throw new ApplicationError('conflict', 'This item was already restored or removed')
    }
    if (kind !== 'workspace') {
      await this.journal.record(item.workspaceId, userId, 'content.purged', item.title, { itemId: kind === 'item' ? id : undefined, folderId: kind === 'folder' ? id : undefined })
    }
  }

  async versions(userId: string, itemId: string) {
    await this.items.get(itemId, userId)
    return this.repository.versions(itemId)
  }

  async version(userId: string, itemId: string, id: string) {
    await this.items.get(itemId, userId)
    const content = await this.repository.version(itemId, id)
    if (content === null) {
      throw new ApplicationError('not_found', 'Version not found')
    }
    return { content }
  }

  async checkpoint(userId: string, itemId: string) {
    await this.items.writable(itemId, userId)
    await this.repository.checkpoint(itemId, userId)
  }

  async restoreVersion(userId: string, itemId: string, id: string) {
    const item = await this.items.writable(itemId, userId)
    const { content } = await this.version(userId, itemId, id)
    if (item.kind === 'document') {
      await this.editor.replaceMarkdown(itemId, content, userId)
    } else if (this.canvases) {
      await this.canvases.replace(itemId, content, userId)
    } else {
      throw new ApplicationError('unavailable', 'Structured content recovery is unavailable')
    }
    await this.journal.record(item.workspaceId, userId, 'content.restored', `${item.title} (version)`, { itemId })
  }
}
