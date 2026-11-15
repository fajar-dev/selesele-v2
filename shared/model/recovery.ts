export type TrashKind = 'item' | 'folder' | 'workspace'
export interface TrashItem {
  id: string
  kind: TrashKind
  title: string
  icon: string | null
  workspaceName: string
  workspaceId: string
  deletedAt: string
  canPurge: boolean
  canRestore: boolean
}
export interface ItemVersion {
  id: string
  createdAt: string
  author: string | null
  content?: string
}
