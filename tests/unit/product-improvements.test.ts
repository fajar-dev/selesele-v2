import { describe, expect, test } from 'bun:test'
import { mergeCanvas } from '../../shared/model/canvasMerge'
import { emptyCanvas } from '../../shared/model/content'
import type { DrawingElement, WhiteboardContent, KanbanContent, KanbanTask } from '../../shared/model/content'
import { nextTaskDate, scheduleRecurringTasks, validateTaskGraph } from '../../shared/model/taskScheduling'
import { attachmentName, attachmentType, MAX_ATTACHMENT_BYTES } from '../../server/features/resources/domain/attachmentPolicy'
import { visibleDrawing } from '../../app/features/whiteboard/domain/visibleDrawing'
import { whiteboardSvg } from '../../app/features/whiteboard/domain/whiteboardSvg'

const element = (x = 0): DrawingElement => ({ id: crypto.randomUUID(), type: 'rectangle', x, y: 0, width: 100, height: 60, points: [], text: '', color: '#18181b', size: 2 })
const board = () => emptyCanvas('kanban') as KanbanContent
const task = (content: KanbanContent, changes: Partial<KanbanTask> = {}): KanbanTask => ({ id: crypto.randomUUID(), number: content.nextNumber++, title: 'Task', description: '', columnId: content.columns[0]!.id, priority: 'normal', assigneeId: null, dueDate: '2026-01-31', labels: [], checklist: [], createdAt: '2026-01-01T00:00:00Z', ...changes })

describe('collaboration merge', () => {
  test('merges independent properties and objects without mutating inputs', () => {
    const base: WhiteboardContent = { kind: 'whiteboard', elements: [element()] }
    const local = structuredClone(base), remote = structuredClone(base)
    local.elements[0]!.x = 20
    remote.elements[0]!.color = '#2563eb'
    remote.elements.push(element(400))
    const merged = mergeCanvas(base, local, remote)
    expect(merged.conflicts).toEqual([])
    expect((merged.content as WhiteboardContent).elements[0]).toMatchObject({ x: 20, color: '#2563eb' })
    expect((merged.content as WhiteboardContent).elements).toHaveLength(2)
    expect(base.elements[0]!.x).toBe(0)
  })
  test('preserves local edits and reports overlapping changes and delete/edit conflicts', () => {
    const base: WhiteboardContent = { kind: 'whiteboard', elements: [element()] }, local = structuredClone(base), remote = structuredClone(base)
    local.elements[0]!.text = 'Local'
    remote.elements[0]!.text = 'Remote'
    expect(mergeCanvas(base, local, remote).conflicts).toHaveLength(1)
    expect((mergeCanvas(base, local, remote).content as WhiteboardContent).elements[0]!.text).toBe('Local')
    remote.elements = []
    expect(mergeCanvas(base, local, remote).conflicts).toHaveLength(1)
  })
  test('simultaneous task additions receive unique numbers and a safe counter', () => {
    const base = board(), local = structuredClone(base), remote = structuredClone(base)
    local.tasks.push(task(local))
    remote.tasks.push(task(remote), task(remote))
    const result = mergeCanvas(base, local, remote)
    expect(result.conflicts).toEqual([])
    const content = result.content as KanbanContent
    expect(new Set(content.tasks.map(task => task.number)).size).toBe(3)
    expect(content.nextNumber).toBeGreaterThan(Math.max(...content.tasks.map(task => task.number)))
  })
})
describe('task scheduling and dependencies', () => {
  test('date recurrence handles year boundaries and leap-month ends', () => {
    expect(nextTaskDate('2024-01-31', 'monthly')).toBe('2024-02-29')
    expect(nextTaskDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextTaskDate('2026-12-31', 'daily')).toBe('2027-01-01')
    expect(nextTaskDate('2026-12-28', 'weekly')).toBe('2027-01-04')
  })
  test('completion creates one occurrence, resets checklist, shifts reminder and survives reopen', () => {
    const base = board()
    base.tasks.push(task(base, { repeat: 'monthly', reminderAt: '2026-01-30T09:00:00Z', checklist: [{ id: crypto.randomUUID(), title: 'Check', done: true }] }))
    const incoming = structuredClone(base)
    incoming.tasks[0]!.completedAt = '2026-01-31T10:00:00Z'
    const result = scheduleRecurringTasks(base, incoming, () => crypto.randomUUID(), '2026-01-31T10:00:00Z')
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[1]).toMatchObject({ dueDate: '2026-02-28', completedAt: null, reminderAt: '2026-02-27T09:00:00.000Z' })
    expect(result.tasks[1]!.checklist[0]!.done).toBe(false)
    expect(scheduleRecurringTasks(result, result, () => crypto.randomUUID(), '2026-02-01T00:00:00Z').tasks).toHaveLength(2)
    const reopened = structuredClone(result)
    reopened.tasks[0]!.completedAt = null
    const saved = scheduleRecurringTasks(result, reopened, () => crypto.randomUUID(), '2026-02-01T00:00:00Z')
    reopened.tasks[0]!.completedAt = '2026-02-01T10:00:00Z'
    expect(scheduleRecurringTasks(saved, reopened, () => crypto.randomUUID(), '2026-02-01T10:00:00Z').tasks).toHaveLength(2)
  })
  test('rejects cycles, missing dependencies and premature parent completion', () => {
    const content = board(), a = task(content), b = task(content)
    content.tasks = [a, b]
    a.dependencies = [b.id]
    b.dependencies = [a.id]
    expect(() => validateTaskGraph(content)).toThrow('cycle')
    b.dependencies = []
    a.dependencies = [crypto.randomUUID()]
    expect(() => validateTaskGraph(content)).toThrow('existing')
    a.dependencies = []
    b.parentId = a.id
    a.completedAt = '2026-01-31T00:00:00Z'
    expect(() => validateTaskGraph(content)).toThrow('subtasks')
    b.completedAt = a.completedAt
    expect(() => validateTaskGraph(content)).not.toThrow()
  })
})
test('attachment validation uses signatures, bounded data and safe names', () => {
  expect(attachmentType(new TextEncoder().encode('%PDF-1.7'), 'fake.png')).toBe('application/pdf')
  expect(attachmentType(new TextEncoder().encode('hello'), 'note.txt')).toBe('text/plain')
  expect(() => attachmentType(new Uint8Array(MAX_ATTACHMENT_BYTES + 1), 'big.txt')).toThrow('10 MB')
  expect(() => attachmentType(new TextEncoder().encode('<svg/>'), 'bad.svg')).toThrow('Supported')
  expect(() => attachmentType(new Uint8Array([0xff]), 'bad.txt')).toThrow()
  expect(attachmentName('../a\n.txt')).not.toContain('/')
})
test('viewport culling retains selections while full export retains offscreen content and escapes text', () => {
  const near = element(), far = element(10000)
  far.type = 'text'
  far.text = '<script>alert("x")</script>'
  expect(visibleDrawing([near, far], { x: 0, y: 0, width: 1000, height: 800 })).toEqual([near])
  expect(visibleDrawing([near, far], { x: 0, y: 0, width: 1000, height: 800 }, [far.id])).toHaveLength(2)
  const svg = whiteboardSvg({ kind: 'whiteboard', elements: [near, far] })
  expect(svg.match(/<g transform=/g)).toHaveLength(2)
  expect(svg).not.toContain('<script>')
  expect(svg).toContain('&lt;script&gt;')
})
