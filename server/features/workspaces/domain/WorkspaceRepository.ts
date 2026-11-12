import type { Workspace, WorkspaceAccess } from './Workspace'

export interface WorkspaceDraft { name: string, icon: string }
export type WorkspaceChanges = Partial<WorkspaceDraft>

export interface WorkspaceRepository {
  list(userId: string): Promise<WorkspaceAccess[]>
  access(id: string, userId: string): Promise<WorkspaceAccess | null>
  create(input: WorkspaceDraft, userId: string): Promise<Workspace>
  update(id: string, input: WorkspaceChanges): Promise<void>
  delete(id: string): Promise<void>
}
