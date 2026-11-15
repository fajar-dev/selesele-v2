import type { KanbanContent, KanbanTask } from './content'

export function nextTaskDate(value: string, repeat: NonNullable<KanbanTask['repeat']>) {
  const date = new Date(`${value}T00:00:00Z`), day = date.getUTCDate()
  if (repeat === 'monthly') {
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + 1)
    const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
    date.setUTCDate(Math.min(day, last))
  } else {
    date.setUTCDate(day + (repeat === 'weekly' ? 7 : 1))
  }
  return date.toISOString().slice(0, 10)
}
export function validateTaskGraph(content: KanbanContent) {
  const byId = new Map(content.tasks.map(task => [task.id, task]))
  for (const type of ['dependencies', 'parentId'] as const) {
    const visited = new Set<string>(), active = new Set<string>()
    const visit = (id: string) => {
      if (active.has(id)) {
        throw new Error(type === 'parentId' ? 'Subtasks cannot form a cycle' : 'Task dependencies cannot form a cycle')
      }
      if (visited.has(id)) {
        return
      }
      const task = byId.get(id)
      if (!task) {
        throw new Error('Choose an existing task on this board')
      }
      active.add(id)
      const targets = type === 'parentId' ? task.parentId ? [task.parentId] : [] : task.dependencies || []
      targets.forEach(visit)
      active.delete(id)
      visited.add(id)
    }
    content.tasks.forEach(task => visit(task.id))
  }
  for (const task of content.tasks) {
    if (task.completedAt && ((task.dependencies || []).some(id => !byId.get(id)?.completedAt) || content.tasks.some(child => child.parentId === task.id && !child.completedAt))) {
      throw new Error('Complete dependencies and subtasks before completing this task')
    }
  }
}
export function scheduleRecurringTasks(previous: KanbanContent, incoming: KanbanContent, id: () => string, now: string): KanbanContent {
  const content: KanbanContent = JSON.parse(JSON.stringify(incoming))
  for (const task of content.tasks.slice()) {
    const before = previous.tasks.find(entry => entry.id === task.id)
    if (before?.nextOccurrenceId) {
      task.nextOccurrenceId = before.nextOccurrenceId
    }
    if (before?.completedAt || !task.completedAt || !task.repeat || task.nextOccurrenceId) {
      continue
    }
    if (content.tasks.length >= 1000) {
      throw new Error('Cannot schedule another occurrence: the board has reached 1,000 tasks')
    }
    const nextId = id(), dueDate = nextTaskDate(task.dueDate || now.slice(0, 10), task.repeat)
    const next = { ...task, id: nextId, number: content.nextNumber++, dueDate, completedAt: null, nextOccurrenceId: undefined, createdAt: now, parentId: null, dependencies: [], checklist: task.checklist.map(entry => ({ ...entry, id: id(), done: false })) }
    if (task.reminderAt && task.dueDate) {
      next.reminderAt = new Date(Date.parse(task.reminderAt) + Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${task.dueDate}T00:00:00Z`)).toISOString()
    } else {
      next.reminderAt = null
    }
    task.nextOccurrenceId = nextId
    content.tasks.push(next)
  }
  return content
}
