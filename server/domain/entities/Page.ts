export interface Page {
  id: string
  workspaceId: string
  folderId: string | null
  title: string
  icon: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
