import type { Folder, FolderChanges } from './Folder'

export interface FolderRepository {
  list(workspaceId: string): Promise<Folder[]>
  find(id: string, workspaceId: string): Promise<Folder | null>
  create(workspaceId: string, name: string): Promise<Folder>
  update(id: string, workspaceId: string, input: FolderChanges): Promise<void>
  delete(id: string, workspaceId: string): Promise<void>
}
