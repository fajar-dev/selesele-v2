export interface PageInput {
  title: string
  icon?: string | null
  folderId?: string | null
}

export type PageUpdate = Partial<Omit<PageInput, 'folderId'>>

export interface PageItem {
  id: string
  workspaceId: string
  folderId: string | null
  title: string
  icon: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
