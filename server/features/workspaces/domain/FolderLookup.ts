import type { Folder } from './Folder'

export interface FolderLookup {
  requireFolder(folderId: string, workspaceId: string): Promise<Folder>
}
