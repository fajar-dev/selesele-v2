export interface Page {
  id: string
  workspaceId: string
  folderId: string | null
  title: string
  description: string
  icon: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface PageDraft {
  title: string
  description?: string
  icon?: string | null
  folderId?: string | null
}
export type PageChanges = Partial<Omit<PageDraft, 'folderId'>>
