import type { MemberItem } from '../kernel/member'
import type { AccessLevel } from '../kernel/access'
import type { WorkspaceSettings } from '../kernel/workspaceSettings'
import type { ContentItem } from './item'
import type { WorkspaceRole } from '../kernel/workspace'

export type { WorkspaceRole, InviteRole } from '../kernel/workspace'
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
