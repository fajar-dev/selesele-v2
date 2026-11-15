import type { DrawingElement, WhiteboardContent } from '#shared/model/content'
import { alignBoxes, clampCoordinate } from '../../canvases/domain/geometry'
import type { Alignment } from '../../canvases/domain/geometry'
import { getStroke } from 'perfect-freehand'

type Point = {
  x: number
  y: number
  pressure?: number
}
export class DrawingScene {
  constructor(private readonly content: WhiteboardContent) {
  }

  create(type: DrawingElement['type'], point: Point, color: string, size: number): DrawingElement {
    return { id: crypto.randomUUID(), type, x: point.x, y: point.y, width: type === 'sticky' ? 200 : 0, height: type === 'sticky' ? 140 : type === 'text' ? 40 : 0, points: [[0, 0, point.pressure || 0.5]], text: type === 'text' ? 'Text' : type === 'sticky' ? 'Note' : '', color, size }
  }

  add(element: DrawingElement): WhiteboardContent {
    if (this.content.elements.length >= 2000) {
      throw new Error('A whiteboard supports up to 2,000 elements')
    }
    return { kind: 'whiteboard', elements: [...this.content.elements, element] }
  }

  update(element: DrawingElement): WhiteboardContent {
    return { kind: 'whiteboard', elements: this.content.elements.map(previous => previous.id === element.id ? element : previous) }
  }

  remove(id: string): WhiteboardContent {
    return { kind: 'whiteboard', elements: this.content.elements.filter(element => element.id !== id) }
  }

  duplicate(id: string): WhiteboardContent {
    const original = this.content.elements.find(element => element.id === id)
    return original ? this.add({ ...JSON.parse(JSON.stringify(original)), id: crypto.randomUUID(), x: original.x + 24, y: original.y + 24 }) : this.content
  }

  front(id: string): WhiteboardContent {
    const element = this.content.elements.find(element => element.id === id)
    return element ? { kind: 'whiteboard', elements: [...this.content.elements.filter(entry => entry.id !== id), element] } : this.content
  }

  static path(element: DrawingElement) {
    const points = getStroke(element.points, { size: element.size, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: true })
    return points.length ? `M ${points.map(point => `${point[0]},${point[1]}`).join(' L ')} Z` : ''
  }

  static bounds(element: DrawingElement) {
    const font = element.fontSize || (element.type === 'sticky' ? 18 : 24)
    const lines = element.text.split('\n')
    const xs = element.type === 'pen' ? element.points.map(point => point[0]!) : [0, element.type === 'text' ? Math.max(40, ...lines.map(line => line.length * font * 0.65)) : element.width]
    const ys = element.type === 'pen' ? element.points.map(point => point[1]!) : [0, element.type === 'text' ? Math.max(font * 1.4, lines.length * font * 1.4) : element.height]
    const x = Math.min(...xs, 0), y = Math.min(...ys, 0)
    return { x: element.x + x, y: element.y + y, width: Math.max(1, Math.max(...xs, 0) - x), height: Math.max(1, Math.max(...ys, 0) - y) }
  }

  changeMany(ids: string[], changes: Partial<DrawingElement>, includeLocked = false): WhiteboardContent {
    return { ...this.content, elements: this.content.elements.map(element => ids.includes(element.id) && (includeLocked || !element.locked) ? { ...element, ...changes, id: element.id } : element) }
  }

  translate(ids: string[], x: number, y: number): WhiteboardContent {
    return { ...this.content, elements: this.content.elements.map(element => ids.includes(element.id) && !element.locked ? { ...element, x: clampCoordinate(element.x + x), y: clampCoordinate(element.y + y) } : element) }
  }

  removeMany(ids: string[]): WhiteboardContent {
    return { ...this.content, elements: this.content.elements.filter(element => !ids.includes(element.id) || element.locked) }
  }

  insert(elements: DrawingElement[], offset = 24): WhiteboardContent {
    if (this.content.elements.length + elements.length > 2000) {
      throw new Error('A whiteboard supports up to 2,000 elements')
    }
    return { ...this.content, elements: [...this.content.elements, ...elements.map(element => ({ ...JSON.parse(JSON.stringify(element)), id: crypto.randomUUID(), locked: false, x: clampCoordinate(element.x + offset), y: clampCoordinate(element.y + offset) }))] }
  }

  layer(ids: string[], front: boolean): WhiteboardContent {
    const moving = this.content.elements.filter(element => ids.includes(element.id) && !element.locked)
    const rest = this.content.elements.filter(element => !moving.includes(element))
    return { ...this.content, elements: front ? [...rest, ...moving] : [...moving, ...rest] }
  }

  align(ids: string[], mode: Alignment): WhiteboardContent {
    const offsets = alignBoxes(this.content.elements.filter(element => ids.includes(element.id) && !element.locked).map(element => ({ id: element.id, ...DrawingScene.bounds(element) })), mode)
    return { ...this.content, elements: this.content.elements.map((element) => {
      const offset = offsets.get(element.id)
      return offset ? { ...element, x: clampCoordinate(element.x + offset.x), y: clampCoordinate(element.y + offset.y) } : element
    }) }
  }

  static resize(element: DrawingElement, width: number, height: number): DrawingElement {
    const bounds = DrawingScene.bounds(element)
    const sx = Math.max(1, width) / bounds.width, sy = Math.max(1, height) / bounds.height
    return { ...element, x: bounds.x + (element.x - bounds.x) * sx, y: bounds.y + (element.y - bounds.y) * sy, width: element.width * sx, height: element.height * sy,
      points: element.points.map(point => [point[0]! * sx, point[1]! * sy, point[2] || 0.5]),
      ...(element.type === 'text' ? { fontSize: Math.min(96, Math.max(12, (element.fontSize || 24) * Math.min(sx, sy))) } : {}) }
  }
}
