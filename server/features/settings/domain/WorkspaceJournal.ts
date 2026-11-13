import type { WorkspaceActivityAction } from '../../../../shared/kernel/workspaceSettings'

export interface ActivityContext {
  memberId?: string
  pageId?: string
  folderId?: string
}
export interface WorkspaceJournal {
  record(workspaceId: string, actorId: string, action: WorkspaceActivityAction, target: string, context?: ActivityContext): Promise<void>
}
