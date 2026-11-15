import { describe, expect, test } from 'bun:test'
import type { DrawingElement, WhiteboardContent, DiagramContent } from '../../shared/model/content'
import { emptyCanvas } from '../../shared/model/content'
import { canvasContentSchema } from '../../shared/validation/canvas'
import { DrawingScene } from '../../app/features/whiteboard/domain/DrawingScene'
import { DiagramGraph } from '../../app/features/diagrams/domain/DiagramGraph'
import { diagramTemplate } from '../../app/features/diagrams/domain/diagramTemplates'
import { alignBoxes } from '../../app/features/canvases/domain/geometry'

const element = (x: number, y = 0): DrawingElement => ({ id: crypto.randomUUID(), type: 'rectangle', x, y, width: 100, height: 60, points: [], text: '', color: '#18181b', size: 2 })

describe('whiteboard selection commands', () => {
  test('bulk movement, delete, style and alignment protect locked elements and preserve the source', () => {
    const a = element(0, 0), b = element(200, 100), locked = { ...element(400, 200), locked: true }
    const source: WhiteboardContent = { kind: 'whiteboard', elements: [a, b, locked] }, ids = source.elements.map(element => element.id)
    const moved = new DrawingScene(source).translate(ids, 20, 30)
    expect(moved.elements[0]!.x).toBe(20)
    expect(moved.elements[2]).toEqual(locked)
    expect(source.elements[0]!.x).toBe(0)
    const aligned = new DrawingScene(source).align(ids, 'top')
    expect(aligned.elements[1]!.y).toBe(0)
    expect(aligned.elements[2]!.y).toBe(200)
    expect(new DrawingScene(source).removeMany(ids).elements).toEqual([locked])
    expect(new DrawingScene(source).changeMany(ids, { fill: '#2563eb' }).elements[2]!.fill).toBeUndefined()
    expect(new DrawingScene(source).changeMany(ids, { locked: false }, true).elements.every(element => !element.locked)).toBe(true)
  })
  test('copies have independent IDs and geometry; layer commands retain relative order', () => {
    const source: WhiteboardContent = { kind: 'whiteboard', elements: [element(0), element(200), element(400)] }
    const copied = new DrawingScene(source).insert(source.elements.slice(0, 2))
    expect(copied.elements).toHaveLength(5)
    expect(new Set(copied.elements.map(element => element.id)).size).toBe(5)
    expect(copied.elements[3]!.x).toBe(24)
    copied.elements[3]!.points.push([1, 2])
    expect(source.elements[0]!.points).toHaveLength(0)
    const ids = source.elements.slice(0, 2).map(element => element.id)
    expect(new DrawingScene(source).layer(ids, true).elements.map(element => element.id)).toEqual([source.elements[2]!.id, ...ids])
  })
  test('negative drawing dimensions and multiline text produce reliable resize and selection bounds', () => {
    const reverse = { ...element(100, 100), width: -100, height: -50 }
    expect(DrawingScene.bounds(reverse)).toEqual({ x: 0, y: 50, width: 100, height: 50 })
    const resized = DrawingScene.resize(reverse, 200, 100)
    expect(DrawingScene.bounds(resized)).toEqual({ x: 0, y: 50, width: 200, height: 100 })
    const text = { ...element(0), type: 'text' as const, text: 'Line one\nLine two\nLine three', fontSize: 32 }
    expect(DrawingScene.bounds(text).height).toBeCloseTo(134.4)
    expect(DrawingScene.bounds({ ...element(0), type: 'pen', points: [] }).width).toBeGreaterThan(0)
  })
})

test('distribution uses object dimensions and preserves the first and last objects', () => {
  const boxes = [{ id: 'a', x: 0, y: 0, width: 100, height: 40 }, { id: 'b', x: 100, y: 40, width: 50, height: 40 }, { id: 'c', x: 300, y: 80, width: 20, height: 40 }]
  const offsets = alignBoxes(boxes, 'horizontal')
  expect(offsets.get('a')!.x).toBe(0)
  expect(offsets.get('b')!.x).toBe(75)
  expect(offsets.get('c')!.x).toBe(0)
  expect(alignBoxes(boxes.slice(0, 2), 'horizontal').size).toBe(0)
})

describe('diagram editing commands', () => {
  test('selection duplication remaps internal connectors and excludes external endpoints', () => {
    const source = diagramTemplate('flowchart')
    const subset: DiagramContent = { kind: 'diagram', nodes: source.nodes.slice(0, 2), edges: source.edges }
    const copied = new DiagramGraph(source).insert(subset)
    expect(copied.nodes).toHaveLength(source.nodes.length + 2)
    expect(copied.edges).toHaveLength(source.edges.length + 1)
    const inserted = copied.nodes.slice(source.nodes.length), edge = copied.edges.at(-1)!
    expect(edge.source).toBe(inserted[0]!.id)
    expect(edge.target).toBe(inserted[1]!.id)
    expect(inserted[0]!.id).not.toBe(source.nodes[0]!.id)
    expect(canvasContentSchema.safeParse(copied).success).toBe(true)
  })
  test('locked nodes survive bulk deletion and layout, while dangling edges are removed', () => {
    const source = diagramTemplate('orgchart'), locked = source.nodes[0]!
    locked.data.locked = true
    const ids = source.nodes.map(node => node.id), before = { ...locked.position }
    const laidOut = new DiagramGraph(source).layout('horizontal')
    expect(laidOut.nodes[0]!.position).toEqual(before)
    expect(source.nodes[1]!.position).toEqual({ x: 0, y: 200 })
    const deleted = new DiagramGraph(source).removeMany(ids)
    expect(deleted.nodes).toHaveLength(1)
    expect(deleted.nodes[0]!.id).toBe(locked.id)
    expect(deleted.edges).toHaveLength(0)
  })
  test('layout handles cycles and disconnected nodes without losing content or producing invalid coordinates', () => {
    const source = diagramTemplate('flowchart')
    for (const direction of ['horizontal', 'vertical', 'grid'] as const) {
      const arranged = new DiagramGraph(source).layout(direction)
      expect(arranged.nodes.map(node => node.id)).toEqual(source.nodes.map(node => node.id))
      expect(arranged.edges).toEqual(source.edges)
      expect(canvasContentSchema.safeParse(arranged).success).toBe(true)
      expect(new Set(arranged.nodes.map(node => `${node.position.x}:${node.position.y}`)).size).toBe(arranged.nodes.length)
    }
  })
  test('cycle-aware layout retains downstream order after a retry loop', () => {
    const source = diagramTemplate('flowchart')
    const arranged = new DiagramGraph(source).layout('vertical')
    const ready = arranged.nodes.find(node => node.data.label === 'Ready?')!, work = arranged.nodes.find(node => node.data.label === 'Do the work')!, done = arranged.nodes.find(node => node.data.label === 'Done')!
    expect(work.position.y).toBeGreaterThan(ready.position.y)
    expect(done.position.y).toBeGreaterThan(work.position.y)
    expect(arranged.nodes.find(node => node.data.label === 'Review inputs')!.position.y).toBe(ready.position.y)
  })
  test('connecting rejects missing nodes and suppresses duplicate connections', () => {
    const source = diagramTemplate('orgchart'), first = source.edges[0]!
    expect(new DiagramGraph(source).connect(first).edges).toHaveLength(source.edges.length)
    expect(() => new DiagramGraph(source).connect({ ...first, target: crypto.randomUUID() })).toThrow()
    expect(() => new DiagramGraph(source).connect({ ...first, target: first.source })).toThrow()
  })
  test('extended appearance survives validation and SVG export escapes labels', () => {
    let source = emptyCanvas('diagram') as DiagramContent
    for (const shape of ['cylinder', 'hexagon', 'parallelogram'] as const) {
      source = new DiagramGraph(source).add(shape, { x: 0, y: 0 })
    }
    source.nodes[0]!.data = { ...source.nodes[0]!.data, fill: '#2563eb', fontSize: 24, dashed: true, label: '<script>& unsafe' }
    source = new DiagramGraph(source).connect({ source: source.nodes[0]!.id, target: source.nodes[1]!.id, sourceHandle: 'bottom', targetHandle: 'top' })
    source.edges[0] = { ...source.edges[0]!, type: 'default', arrow: 'both', color: '#9333ea', animated: true, dashed: true }
    expect(canvasContentSchema.parse(source)).toEqual(source)
    const svg = new DiagramGraph(source).toSvg()
    expect(svg).toContain('&lt;script&gt;&amp; unsafe')
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('marker-start=')
    expect(svg).toContain('#9333ea')
    expect(svg).toContain('stroke-dasharray=')
  })
})

test('legacy snapshots remain accepted and invalid appearance values are rejected', () => {
  const source: WhiteboardContent = { kind: 'whiteboard', elements: [element(0)] }
  expect(canvasContentSchema.safeParse(source).success).toBe(true)
  expect(canvasContentSchema.safeParse({ ...source, elements: [{ ...source.elements[0], fill: 'url(https://example.com)', opacity: 2 }] }).success).toBe(false)
  expect(canvasContentSchema.safeParse({ ...source, elements: [{ ...source.elements[0], fontSize: -1 }] }).success).toBe(false)
})
