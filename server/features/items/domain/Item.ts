import type { ItemKind } from '../../../../shared/kernel/content'

export interface Item {
  kind: ItemKind
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
  archivedAt?: Date | null
}
export interface ItemDraft {
  kind?: ItemKind
  title: string
  description?: string
  icon?: string | null
  folderId?: string | null
}
export type ItemChanges = Partial<Omit<ItemDraft, 'folderId' | 'kind'>>
