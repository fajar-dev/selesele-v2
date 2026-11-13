export const itemKinds = ['document', 'kanban', 'whiteboard', 'diagram'] as const
export type ItemKind = typeof itemKinds[number]
export type CanvasKind = Exclude<ItemKind, 'document'>
export const itemTypeLabels: Record<ItemKind, string> = { document: 'Document', kanban: 'Kanban', whiteboard: 'Whiteboard', diagram: 'Diagram' }
export const itemTypeIcons: Record<ItemKind, string> = { document: '📄', kanban: '📋', whiteboard: '🎨', diagram: '🔀' }
export const canvasColors = ['#18181b', '#71717a', '#dc2626', '#d97706', '#16a34a', '#2563eb', '#9333ea'] as const
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export interface KanbanTask {
  id: string
  number: number
  title: string
  description: string
  columnId: string
  priority: TaskPriority
  assigneeId: string | null
  dueDate: string | null
  labels: string[]
  checklist: {
    id: string
    title: string
    done: boolean
  }[]
  createdAt: string
}
export interface KanbanContent {
  kind: 'kanban'
  columns: {
    id: string
    title: string
    limit: number | null
  }[]
  tasks: KanbanTask[]
  nextNumber: number
}
export interface DrawingElement {
  id: string
  type: 'pen' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'text' | 'sticky'
  x: number
  y: number
  width: number
  height: number
  points: number[][]
  text: string
  color: string
  size: number
}
export interface WhiteboardContent {
  kind: 'whiteboard'
  elements: DrawingElement[]
}
export interface DiagramNode {
  id: string
  type: 'shape'
  position: {
    x: number
    y: number
  }
  data: {
    label: string
    shape: 'rectangle' | 'ellipse' | 'diamond' | 'note'
    color: string
    width: number
    height: number
  }
}
export interface DiagramEdge {
  id: string
  source: string
  target: string
  sourceHandle: string | null
  targetHandle: string | null
  label: string
  type: 'smoothstep' | 'straight' | 'step'
}
export interface DiagramContent {
  kind: 'diagram'
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}
export type CanvasContent = KanbanContent | WhiteboardContent | DiagramContent
export interface CanvasSnapshot {
  content: CanvasContent
  revision: number
  updatedAt: string
}
export function emptyCanvas(kind: CanvasKind): CanvasContent {
  if (kind === 'kanban') {
    return { kind, columns: ['To do', 'In progress', 'Done'].map(title => ({ id: crypto.randomUUID(), title, limit: null })), tasks: [], nextNumber: 1 }
  }
  return kind === 'whiteboard' ? { kind, elements: [] } : { kind, nodes: [], edges: [] }
}
