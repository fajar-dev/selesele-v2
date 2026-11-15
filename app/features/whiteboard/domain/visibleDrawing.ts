import type { DrawingElement } from '#shared/model/content'
import { DrawingScene } from './DrawingScene'

export function visibleDrawing(elements: DrawingElement[], view: { x: number, y: number, width: number, height: number }, selected: string[] = []) {
  const retained = new Set(selected)
  return elements.filter((element) => {
    if (retained.has(element.id)) {
      return true
    }
    const box = DrawingScene.bounds(element)
    return box.x + box.width >= view.x - 80 && box.y + box.height >= view.y - 80 && box.x <= view.x + view.width + 80 && box.y <= view.y + view.height + 80
  })
}
