import type { Folder } from './Folder'

export interface FolderRepository {
  list(workspaceId: string): Promise<Folder[]>
  find(id: string, workspaceId: string): Promise<Folder | null>
  create(workspaceId: string, name: string): Promise<Folder>
  rename(id: string, workspaceId: string, name: string): Promise<void>
  delete(id: string, workspaceId: string): Promise<void>
}
