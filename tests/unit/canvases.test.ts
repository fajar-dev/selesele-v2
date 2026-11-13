import { describe, expect, test } from 'bun:test'
import { emptyCanvas } from '../../shared/kernel/content'
import type { CanvasContent, CanvasSnapshot, KanbanContent, DiagramContent } from '../../shared/kernel/content'
import { canvasContentSchema } from '../../shared/validation/canvas'
import { validateCanvas } from '../../server/features/canvases/domain/canvasPolicy'
import { KanbanBoard } from '../../app/features/kanban/domain/KanbanBoard'
import { DiagramGraph } from '../../app/features/diagrams/domain/DiagramGraph'
import { CanvasSession } from '../../app/features/canvases/domain/CanvasSession'

const initial = (): CanvasSnapshot => ({ content: emptyCanvas('kanban'), revision: 0, updatedAt: new Date().toISOString() })
describe('typed content boundaries', () => {
  test('each factory produces a validated document of the requested type', () => {
    for (const kind of ['kanban', 'whiteboard', 'diagram'] as const) {
      const state = emptyCanvas(kind)
      expect(canvasContentSchema.parse(state).kind).toBe(kind)
      expect(() => validateCanvas(state, kind)).not.toThrow()
    }
  })
  test('rejects mismatched kinds, dangling edges, duplicate IDs and impossible due dates', () => {
    const board = emptyCanvas('kanban') as KanbanContent
    expect(() => validateCanvas(board, 'whiteboard')).toThrow()
    expect(() => validateCanvas({ ...board, columns: [board.columns[0]!, board.columns[0]!] }, 'kanban')).toThrow()
    const graph = emptyCanvas('diagram') as DiagramContent
    graph.edges.push({ id: crypto.randomUUID(), source: crypto.randomUUID(), target: crypto.randomUUID(), sourceHandle: null, targetHandle: null, label: '', type: 'straight' })
    expect(() => validateCanvas(graph, 'diagram')).toThrow()
    const taskBoard = new KanbanBoard(board).addTask(board.columns[0]!.id)
    taskBoard.tasks[0]!.dueDate = '2026-02-31'
    expect(canvasContentSchema.safeParse(taskBoard).success).toBe(false)
  })
})
describe('kanban commands', () => {
  test('moving and reordering tasks preserve task identity and enforce WIP without mutating the source', () => {
    const seed = emptyCanvas('kanban') as KanbanContent
    const a = seed.columns[0]!.id, b = seed.columns[1]!.id
    const first = new KanbanBoard(seed).addTask(a)
    const second = new KanbanBoard(first).addTask(a)
    const moved = new KanbanBoard(second).moveTask(second.tasks[0]!.id, b)
    expect(seed.tasks.length).toBe(0)
    expect(moved.tasks.find(task => task.id === first.tasks[0]!.id)?.columnId).toBe(b)
    const limited = new KanbanBoard(moved).updateColumn(b, 'Doing', 1)
    expect(() => new KanbanBoard(limited).moveTask(limited.tasks.find(task => task.columnId === a)!.id, b)).toThrow()
    expect(limited.tasks.filter(task => task.columnId === b)).toHaveLength(1)
    expect(new KanbanBoard(second).moveTask(second.tasks[1]!.id, a, second.tasks[0]!.id).tasks[0]!.number).toBe(2)
  })
  test('column deletion rehomes tasks and duplication creates independent checklist IDs', () => {
    const board = emptyCanvas('kanban') as KanbanContent
    const withTask = new KanbanBoard(board).addTask(board.columns[1]!.id)
    withTask.tasks[0]!.checklist = [{ id: crypto.randomUUID(), title: 'Review', done: false }]
    const copy = new KanbanBoard(withTask).duplicateTask(withTask.tasks[0]!.id)
    expect(copy.tasks[1]!.checklist[0]!.id).not.toBe(copy.tasks[0]!.checklist[0]!.id)
    const removed = new KanbanBoard(copy).removeColumn(board.columns[1]!.id)
    expect(removed.tasks.every(task => task.columnId === board.columns[0]!.id)).toBe(true)
  })
})
test('diagram deletion removes dangling connectors and duplication preserves its source', () => {
  const original = new DiagramGraph(emptyCanvas('diagram') as DiagramContent).add('rectangle', { x: 0, y: 0 })
  const pair = new DiagramGraph(original).duplicate(original.nodes[0]!.id)
  const linked = new DiagramGraph(pair).connect({ source: pair.nodes[0]!.id, target: pair.nodes[1]!.id, sourceHandle: 'right', targetHandle: 'left' })
  const removed = new DiagramGraph(linked).removeNode(pair.nodes[0]!.id)
  expect(removed.nodes).toHaveLength(1)
  expect(removed.edges).toHaveLength(0)
  expect(original.nodes).toHaveLength(1)
  original.nodes[0]!.data.label = '<script>alert("x")</script>'
  const exported = new DiagramGraph(original).toSvg()
  expect(exported).not.toContain('<script>')
  expect(exported).toContain('&lt;script&gt;')
})
describe('canvas persistence sessions', () => {
  test('keeps edits made during a save and writes them against the acknowledged revision', async () => {
    let finish: ((state: {
      data: CanvasSnapshot
    }) => void) | undefined
    const state = initial(), writes: number[] = []
    const gateway = { get: async () => ({ data: state }), save: async (_id: string, content: CanvasContent, revision: number) => {
      writes.push(revision)
      if (writes.length === 1) {
        return new Promise<{
          data: CanvasSnapshot
        }>((resolve) => {
          finish = resolve
        })
      }
      return { data: { content, revision: revision + 1, updatedAt: state.updatedAt } }
    } }
    const session = new CanvasSession(gateway, 'test', state)
    session.edit(new KanbanBoard(session.draft as KanbanContent).addColumn('Review'))
    const firstDraft = session.draft
    const pending = session.save()
    session.edit(new KanbanBoard(session.draft as KanbanContent).addColumn('Approved'))
    finish!({ data: { content: firstDraft, revision: 1, updatedAt: state.updatedAt } })
    await pending
    expect(session.dirty).toBe(true)
    await session.save()
    expect(writes).toEqual([0, 1])
    expect(session.dirty).toBe(false)
    session.undo()
    expect(session.dirty).toBe(true)
    session.redo()
    expect(session.dirty).toBe(false)
  })
  test('remote changes never overwrite a dirty draft and require an explicit replacement', async () => {
    const state = initial(), latest = { ...state, revision: 2 }
    let revision = -1
    const gateway = { get: async () => ({ data: latest }), save: async (_id: string, content: CanvasContent, value: number) => {
      revision = value
      return { data: { ...latest, content, revision: value + 1 } }
    } }
    const session = new CanvasSession(gateway, 'test', state)
    session.edit(new KanbanBoard(session.draft as KanbanContent).addColumn('Review'))
    session.observe(latest)
    expect((session.draft as KanbanContent).columns).toHaveLength(4)
    await expect(session.save()).rejects.toThrow()
    await session.replaceRemote()
    expect(revision).toBe(2)
    expect(session.dirty).toBe(false)
  })
})

test('canonical content acknowledgement does not create an endless save loop after JSON key reordering', async () => {
  const state = initial()
  const gateway = { get: async () => ({ data: state }), save: async (_id: string, content: CanvasContent, revision: number) => {
    // MySQL stores JSON objects with a normalized key order.
    const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([key, entry]) => [key, reorder(entry)])) : value
    return { data: { content: reorder(content) as CanvasContent, revision: revision + 1, updatedAt: state.updatedAt } }
  } }
  const session = new CanvasSession(gateway, 'test', state)
  session.edit(new KanbanBoard(session.draft as KanbanContent).addColumn('Review'))
  await session.save()
  expect(session.dirty).toBe(false)
})
