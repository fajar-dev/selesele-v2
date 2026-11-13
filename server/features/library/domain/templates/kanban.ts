import type { ItemTemplate } from '../../../../../shared/kernel/library'
import type { KanbanContent } from '../../../../../shared/kernel/content'

function board(id: string, title: string, description: string, columns: string[], tasks: { title: string, column: number, description: string, labels: string[] }[]): ItemTemplate {
  const columnIds = columns.map(() => crypto.randomUUID())
  const content: KanbanContent = {
    kind: 'kanban',
    columns: columns.map((title, index) => ({ id: columnIds[index]!, title, limit: index === 1 ? 3 : null })),
    nextNumber: tasks.length + 1,
    tasks: tasks.map((task, index) => ({
      id: crypto.randomUUID(), number: index + 1, title: task.title, description: task.description,
      columnId: columnIds[task.column]!, priority: 'normal', assigneeId: null, dueDate: null,
      labels: task.labels, checklist: [], createdAt: new Date().toISOString()
    }))
  }
  return { id, title, description, kind: 'kanban', icon: '📋', content: JSON.stringify(content) }
}

export const kanbanTemplates: ItemTemplate[] = [
  board('project-board', 'Project delivery', 'Plan work, track progress, and review what is ready to ship.', ['Backlog', 'In progress', 'Review', 'Done'], [
    { title: 'Define the project scope', column: 0, description: 'Agree on the goal, deliverables, and success criteria.', labels: ['Planning'] },
    { title: 'Explore the first solution', column: 1, description: 'Capture an approach and share it with the team.', labels: ['Discovery'] },
    { title: 'Review acceptance criteria', column: 2, description: 'Check that the proposed work meets the agreed outcome.', labels: ['Review'] }
  ]),
  board('editorial-board', 'Content pipeline', 'Take ideas from the first draft to publication.', ['Ideas', 'Writing', 'Editing', 'Published'], [
    { title: 'Collect audience questions', column: 0, description: 'What would be most useful for your audience?', labels: ['Research'] },
    { title: 'Draft the next team update', column: 1, description: 'Outline the key message, evidence, and call to action.', labels: ['Update'] },
    { title: 'Review the launch announcement', column: 2, description: 'Check clarity, facts, and links before publishing.', labels: ['Launch'] }
  ])
]
