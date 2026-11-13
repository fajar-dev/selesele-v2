import type { CanvasContent, CanvasSnapshot } from '../../../../shared/kernel/content'

export interface CanvasRepository {
  find(itemId: string): Promise<CanvasSnapshot | null>
  save(itemId: string, userId: string, content: CanvasContent, revision: number, checkpoint?: boolean): Promise<CanvasSnapshot>
}
export interface CanvasCodec {
  decode(value: string): CanvasContent
}
export interface CanvasEditor {
  replace(itemId: string, value: string, userId: string): Promise<void>
}
