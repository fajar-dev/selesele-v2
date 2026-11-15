export interface CanvasBox { id: string, x: number, y: number, width: number, height: number }
export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'horizontal' | 'vertical'
export function boundingBox(boxes: Omit<CanvasBox, 'id'>[]) {
  if (!boxes.length) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  const x = Math.min(...boxes.map(box => box.x)), y = Math.min(...boxes.map(box => box.y))
  return { x, y, width: Math.max(...boxes.map(box => box.x + box.width)) - x, height: Math.max(...boxes.map(box => box.y + box.height)) - y }
}
/** Returns translation offsets, preserving object geometry and the outer selection bounds. */
export function alignBoxes(boxes: CanvasBox[], mode: Alignment): Map<string, { x: number, y: number }> {
  const offsets = new Map<string, { x: number, y: number }>()
  if (boxes.length < 2) {
    return offsets
  }
  const bounds = boundingBox(boxes)
  if (mode === 'horizontal' || mode === 'vertical') {
    if (boxes.length < 3) {
      return offsets
    }
    const axis = mode === 'horizontal' ? 'x' : 'y', dimension = axis === 'x' ? 'width' : 'height'
    const sorted = [...boxes].sort((a, b) => a[axis] - b[axis] || a.id.localeCompare(b.id))
    const gap = (bounds[dimension] - boxes.reduce((sum, box) => sum + box[dimension], 0)) / (boxes.length - 1)
    let cursor = sorted[0]![axis]
    sorted.forEach((box) => {
      offsets.set(box.id, { x: axis === 'x' ? cursor - box.x : 0, y: axis === 'y' ? cursor - box.y : 0 })
      cursor += box[dimension] + gap
    })
    return offsets
  }
  boxes.forEach(box => offsets.set(box.id, {
    x: mode === 'left' ? bounds.x - box.x : mode === 'right' ? bounds.x + bounds.width - box.width - box.x : mode === 'center' ? bounds.x + (bounds.width - box.width) / 2 - box.x : 0,
    y: mode === 'top' ? bounds.y - box.y : mode === 'bottom' ? bounds.y + bounds.height - box.height - box.y : mode === 'middle' ? bounds.y + (bounds.height - box.height) / 2 - box.y : 0
  }))
  return offsets
}
export const clampCoordinate = (value: number) => Math.max(-100000, Math.min(100000, value))
