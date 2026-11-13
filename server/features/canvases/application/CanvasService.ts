import type { CanvasRepository, CanvasCodec, CanvasEditor } from '../domain/CanvasRepository'
import type { CanvasContent } from '../../../../shared/kernel/content'
import type { ItemAccess } from '../../items/domain/ItemAccess'
import { validateCanvas } from '../domain/canvasPolicy'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class CanvasService implements CanvasEditor {
  constructor(private readonly repository: CanvasRepository, private readonly items: ItemAccess, private readonly codec: CanvasCodec) {
  }

  async get(id: string, userId: string) {
    const item = await this.items.get(id, userId)
    if (item.kind === 'document') {
      throw new ApplicationError('invalid_input', 'This item uses the document editor')
    }
    const state = await this.repository.find(id)
    if (!state) {
      throw new ApplicationError('not_found', 'Item content not found')
    }
    return state
  }

  async save(id: string, userId: string, content: CanvasContent, revision: number, checkpoint = false) {
    const item = await this.items.writable(id, userId)
    if (item.kind === 'document') {
      throw new ApplicationError('invalid_input', 'This item uses the document editor')
    }
    validateCanvas(content, item.kind)
    return this.repository.save(id, userId, content, revision, checkpoint)
  }

  async replace(id: string, value: string, userId: string) {
    const state = await this.get(id, userId)
    await this.save(id, userId, this.codec.decode(value), state.revision, true)
  }
}
