import type { CanvasRepository, CanvasCodec, CanvasEditor } from '../domain/CanvasRepository'
import type { CanvasContent } from '../../../../shared/model/content'
import type { ItemAccess } from '../../items/domain/ItemAccess'
import { mergeCanvas } from '../../../../shared/model/canvasMerge'
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

  async save(id: string, userId: string, content: CanvasContent, revision: number, checkpoint = false, base?: CanvasContent) {
    const item = await this.items.writable(id, userId)
    if (item.kind === 'document') {
      throw new ApplicationError('invalid_input', 'This item uses the document editor')
    }
    validateCanvas(content, item.kind)
    let draft = content, expected = revision
    for (let attempt = 0; attempt < 4; attempt++) {
      const latest = await this.repository.find(id)
      if (latest && latest.revision !== expected && base) {
        const merged = mergeCanvas(base, content, latest.content)
        if (merged.conflicts.length) {
          throw new ApplicationError('conflict', 'The same object was changed by another member. Your draft is preserved for review.')
        }
        draft = merged.content
        expected = latest.revision
        validateCanvas(draft, item.kind)
      }
      try {
        return await this.repository.save(id, userId, draft, expected, checkpoint)
      } catch (cause) {
        if (!(cause instanceof ApplicationError) || cause.code !== 'conflict' || !base || attempt === 3) {
          throw cause
        }
      }
    }
    throw new ApplicationError('conflict', 'Changes are arriving quickly. Please retry.')
  }

  async replace(id: string, value: string, userId: string) {
    const state = await this.get(id, userId)
    await this.save(id, userId, this.codec.decode(value), state.revision, true)
  }
}
