import type { KanbanContent, KanbanTask } from '#shared/kernel/content'
/** Immutable board commands keep UI gestures and persistence independent. */
export class KanbanBoard {
  private readonly content: KanbanContent
  constructor(content: KanbanContent, private readonly id: () => string = () => crypto.randomUUID(), private readonly now = () => new Date().toISOString()) {
    this.content = JSON.parse(JSON.stringify(content))
  }

  private column(id: string) {
    const column = this.content.columns.find(column => column.id === id)
    if (!column) {
      throw new Error('Column no longer exists')
    }
    return column
  }

  addColumn(title: string) {
    if (this.content.columns.length >= 20) {
      throw new Error('A board supports up to 20 columns')
    }
    this.content.columns.push({ id: this.id(), title: title.trim() || 'New column', limit: null })
    return this.content
  }

  updateColumn(id: string, title: string, limit: number | null) {
    const column = this.column(id)
    if (limit && this.content.tasks.filter(task => task.columnId === id).length > limit) {
      throw new Error('Move tasks out before lowering this column’s limit')
    }
    Object.assign(column, { title: title.trim() || column.title, limit })
    return this.content
  }

  removeColumn(id: string) {
    const destination = this.content.columns.find(column => column.id !== id)
    if (!destination) {
      throw new Error('Keep at least one column')
    }
    this.content.columns = this.content.columns.filter(column => column.id !== id)
    this.content.tasks.forEach((task) => {
      if (task.columnId === id) {
        task.columnId = destination.id
      }
    })
    this.checkLimit(destination.id)
    return this.content
  }

  reorderColumn(id: string, offset: number) {
    const index = this.content.columns.findIndex(column => column.id === id)
    const target = index + offset
    if (index < 0 || target < 0 || target >= this.content.columns.length) {
      return this.content
    }
    const [column] = this.content.columns.splice(index, 1)
    this.content.columns.splice(target, 0, column!)
    return this.content
  }

  addTask(columnId: string) {
    this.column(columnId)
    if (this.content.tasks.length >= 1000) {
      throw new Error('A board supports up to 1,000 tasks')
    }
    this.content.tasks.push({ id: this.id(), number: this.content.nextNumber++, columnId, title: 'Untitled task', description: '', priority: 'normal', assigneeId: null, dueDate: null, labels: [], checklist: [], createdAt: this.now() })
    this.checkLimit(columnId)
    return this.content
  }

  updateTask(task: KanbanTask) {
    this.column(task.columnId)
    const previous = this.content.tasks.find(entry => entry.id === task.id)
    if (!previous) {
      throw new Error('Task no longer exists')
    }
    Object.assign(previous, task)
    this.checkLimit(task.columnId)
    return this.content
  }

  moveTask(id: string, columnId: string, before?: string) {
    this.column(columnId)
    const task = this.content.tasks.find(task => task.id === id)
    if (!task || id === before) {
      return this.content
    }
    this.content.tasks = this.content.tasks.filter(entry => entry.id !== id)
    task.columnId = columnId
    const index = before ? this.content.tasks.findIndex(entry => entry.id === before) : -1
    this.content.tasks.splice(index < 0 ? this.content.tasks.length : index, 0, task)
    this.checkLimit(columnId)
    return this.content
  }

  removeTask(id: string) {
    this.content.tasks = this.content.tasks.filter(task => task.id !== id)
    return this.content
  }

  duplicateTask(id: string) {
    const source = this.content.tasks.find(task => task.id === id)
    if (!source) {
      throw new Error('Task no longer exists')
    }
    if (this.content.tasks.length >= 1000) {
      throw new Error('A board supports up to 1,000 tasks')
    }
    this.content.tasks.push({ ...source, id: this.id(), number: this.content.nextNumber++, title: `${source.title} (copy)`.slice(0, 255), createdAt: this.now(), checklist: source.checklist.map(entry => ({ ...entry, id: this.id() })) })
    this.checkLimit(source.columnId)
    return this.content
  }

  private checkLimit(id: string) {
    const column = this.column(id)
    if (column.limit && this.content.tasks.filter(task => task.columnId === id).length > column.limit) {
      throw new Error(`${column.title} has reached its work-in-progress limit`)
    }
  }
}
