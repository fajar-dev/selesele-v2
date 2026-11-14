import type { KanbanTask } from '../kernel/content'

export interface MyTask extends KanbanTask {
  itemId: string
  itemTitle: string
  workspaceId: string
  workspaceName: string
  columnTitle: string
}
