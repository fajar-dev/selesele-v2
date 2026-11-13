import type { CanvasContent, CanvasKind } from '../../../../shared/kernel/content'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export function validateCanvas(content: CanvasContent, kind: CanvasKind) {
  const reject = (message: string): never => {
    throw new ApplicationError('invalid_input', message)
  }
  const unique = (ids: string[]) => new Set(ids).size === ids.length
  if (content.kind !== kind) {
    reject('The content type cannot be changed')
  }
  if (JSON.stringify(content).length > 1000000) {
    reject('This item exceeds the content size limit')
  }
  if (content.kind === 'kanban') {
    if (!unique(content.columns.map(column => column.id)) || !unique(content.tasks.map(task => task.id)) || !unique(content.tasks.map(task => String(task.number)))) {
      reject('Task and column identifiers must be unique')
    }
    if (content.tasks.some(task => !content.columns.some(column => column.id === task.columnId) || !unique(task.checklist.map(entry => entry.id)))) {
      reject('Tasks must belong to a valid column and checklist entries must be unique')
    }
    if (content.nextNumber <= Math.max(0, ...content.tasks.map(task => task.number))) {
      reject('The next task number must follow existing tasks')
    }
    for (const column of content.columns) {
      if (column.limit && content.tasks.filter(task => task.columnId === column.id).length > column.limit) {
        reject(`${column.title} has reached its work-in-progress limit`)
      }
    }
  } else if (content.kind === 'diagram') {
    if (!unique(content.nodes.map(node => node.id)) || !unique(content.edges.map(edge => edge.id))) {
      reject('Node and connector identifiers must be unique')
    }
    const nodes = new Set(content.nodes.map(node => node.id))
    if (content.edges.some(edge => !nodes.has(edge.source) || !nodes.has(edge.target))) {
      reject('Every connector must connect existing shapes')
    }
  } else if (!unique(content.elements.map(element => element.id)) || content.elements.reduce((count, element) => count + element.points.length, 0) > 60000) {
    reject('Drawing elements must be unique and contain at most 60,000 points')
  }
}
export function canvasSearchText(content: CanvasContent): string {
  if (content.kind === 'kanban') {
    return [...content.columns.map(column => column.title), ...content.tasks.map(task => `#${task.number} ${task.title}\n${task.description}\n${task.labels.join(' ')}\n${task.checklist.map(entry => entry.title).join('\n')}`)].join('\n')
  }
  if (content.kind === 'diagram') {
    return [...content.nodes.map(node => node.data.label), ...content.edges.map(edge => edge.label)].join('\n')
  }
  return content.elements.map(element => element.text).filter(Boolean).join('\n')
}
