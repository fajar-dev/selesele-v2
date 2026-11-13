import { canvasContentSchema } from '../../../../shared/validation/canvas'
import type { CanvasCodec } from '../domain/CanvasRepository'

export class ZodCanvasCodec implements CanvasCodec {
  decode(value: string) {
    return canvasContentSchema.parse(JSON.parse(value))
  }
}
