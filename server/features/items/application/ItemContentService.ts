import type { CanvasRepository } from '../../canvases/domain/CanvasRepository'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import type { ItemAccess } from '../domain/ItemAccess'
import type { DocumentRepository } from '../domain/DocumentRepository'
import type { DocumentEditor } from '../domain/DocumentEditor'

export class ItemContentService {
  constructor(private readonly items: ItemAccess, private readonly documents: DocumentRepository, private readonly editor: DocumentEditor, private readonly canvases?: CanvasRepository) {
  }

  async content(id: string, userId: string): Promise<string> {
    const item = await this.items.get(id, userId)
    if (item.kind !== 'document') {
      const canvas = await this.canvases?.find(id)
      if (!canvas) {
        throw new ApplicationError('not_found', 'Item content not found')
      }
      return JSON.stringify(canvas.content, null, 2)
    }
    return this.documents.readContent(id)
  }

  async state(id: string, userId: string) {
    const item = await this.items.get(id, userId)
    if (item.kind !== 'document') {
      throw new ApplicationError('invalid_input', 'This item does not contain a text document')
    }
    return this.documents.readState(id)
  }

  async replace(id: string, content: string, userId: string): Promise<void> {
    const item = await this.items.writable(id, userId)
    if (item.kind !== 'document') {
      throw new ApplicationError('invalid_input', 'Use the structured editor for this item')
    }
    await this.editor.replaceMarkdown(id, content, userId)
  }
}
