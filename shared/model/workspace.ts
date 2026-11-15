import type { MemberItem } from './member'
import type { AccessLevel } from './access'
import type { WorkspaceSettings } from './workspaceSettings'
import type { ContentItem } from './item'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'
export type InviteRole = Exclude<WorkspaceRole, 'owner'>

export interface WorkspaceItem {
  id: string
  name: string
  description: string
  icon: string
  role: WorkspaceRole
  archivedAt: string | null
  settings: WorkspaceSettings
  createdAt: string
  updatedAt: string
}
export interface FolderItem {
  accessLevel: AccessLevel
  canManageAccess: boolean
  icon: string | null
  id: string
  workspaceId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}
export type WorkspaceMember = MemberItem
export interface WorkspaceOverview {
  workspace: WorkspaceItem
  folders: FolderItem[]
  items: ContentItem[]
  members: WorkspaceMember[]
}
export type WorkspaceUpdate = Partial<Pick<WorkspaceItem, 'name' | 'description' | 'icon'>>
export type FolderUpdate = Partial<Pick<FolderItem, 'name' | 'description' | 'icon'>>
