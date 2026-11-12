export interface FolderChanges { name?: string, description?: string, icon?: string | null }

export interface Folder {
  icon: string | null
  id: string
  workspaceId: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}
