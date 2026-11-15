import { strict as assert } from 'node:assert'
import type { DrawingElement } from '../shared/model/content'
import { visibleDrawing } from '../app/features/whiteboard/domain/visibleDrawing'
import { whiteboardSvg } from '../app/features/whiteboard/domain/whiteboardSvg'

const elements: DrawingElement[] = Array.from({ length: 2000 }, (_, index) => ({ id: crypto.randomUUID(), type: 'rectangle', x: index % 50 * 220, y: Math.floor(index / 50) * 160, width: 100, height: 60, points: [], text: '', color: '#18181b', size: 2 }))
const started = performance.now()
let count = 0
for (let frame = 0; frame < 120; frame++) {
  count = visibleDrawing(elements, { x: frame * 10, y: 0, width: 1200, height: 800 }).length
}
const frameMs = (performance.now() - started) / 120
assert.ok(count < 100, `Expected viewport culling, got ${count} elements`)
assert.ok(frameMs < 50, `Viewport filtering exceeded 50ms: ${frameMs}`)
const exportStart = performance.now(), svg = whiteboardSvg({ kind: 'whiteboard', elements })
assert.equal((svg.match(/<g transform=/g) || []).length, elements.length)
console.log(JSON.stringify({ elements: elements.length, visibleElements: count, averageFilterMs: +frameMs.toFixed(2), exportMs: +(performance.now() - exportStart).toFixed(2), exportBytes: svg.length }))
