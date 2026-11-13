import type { ItemKind } from '../kernel/content'
import type { AccessLevel } from '../kernel/access'

export interface ItemInput {
  kind?: ItemKind
  title: string
  description?: string
  icon?: string | null
  folderId?: string | null
}
export type ItemUpdate = Partial<Omit<ItemInput, 'folderId' | 'kind'>>
export interface ContentItem {
  kind: ItemKind
  id: string
  workspaceId: string
  folderId: string | null
  title: string
  description: string
  icon: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  archivedAt?: string | null
  accessLevel: AccessLevel
  canManageAccess: boolean
}
