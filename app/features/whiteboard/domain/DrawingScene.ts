import type { DrawingElement, WhiteboardContent } from '#shared/kernel/content'
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
    const xs = element.type === 'pen' ? element.points.map(point => point[0]!) : [0, element.type === 'text' ? Math.max(80, element.text.length * 14) : element.width]
    const ys = element.type === 'pen' ? element.points.map(point => point[1]!) : [0, element.height || 36]
    const x = Math.min(...xs, 0), y = Math.min(...ys, 0)
    return { x: element.x + x, y: element.y + y, width: Math.max(...xs, 0) - x + element.size, height: Math.max(...ys, 0) - y + element.size }
  }
}
