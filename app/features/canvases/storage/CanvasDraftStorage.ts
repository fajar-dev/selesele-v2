import { canvasContentSchema } from '#shared/validation/canvas'
import type { CanvasContent } from '#shared/kernel/content'

export interface SavedCanvasDraft {
  content: CanvasContent
  revision: number
  savedAt: number
}
export class CanvasDraftStorage {
  private key: string
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, userId: string, itemId: string) {
    this.key = `sele:canvas-draft:${userId}:${itemId}`
  }

  read(now = Date.now()): SavedCanvasDraft | null {
    try {
      const raw = this.storage.getItem(this.key)
      if (!raw) {
        return null
      }
      const value = JSON.parse(raw)
      if (!Number.isSafeInteger(value.revision) || value.revision < 0 || !Number.isFinite(value.savedAt) || now - value.savedAt > 30 * 86400000) {
        this.clear()
        return null
      }
      return { content: canvasContentSchema.parse(value.content), revision: value.revision, savedAt: value.savedAt }
    } catch {
      return null
    }
  }

  write(value: SavedCanvasDraft) {
    this.storage.setItem(this.key, JSON.stringify(value))
  }

  clear() {
    this.storage.removeItem(this.key)
  }
}
