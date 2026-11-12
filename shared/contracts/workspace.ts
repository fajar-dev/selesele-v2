import type { PageItem } from './page'

import type { WorkspaceRole, InviteRole } from '../kernel/workspace'

export type { WorkspaceRole, InviteRole } from '../kernel/workspace'

export interface WorkspaceItem {
  id: string
  name: string
  description: string
  icon: string
  role: WorkspaceRole
  createdAt: string
  updatedAt: string
}

export interface FolderItem {
  icon: string | null
  id: string
  workspaceId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  userId: string
  email: string
  name: string | null
  avatar: string | null
  role: WorkspaceRole
}

export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  workspaceName: string
  email: string
  role: InviteRole
  expiresAt: string
}

export interface WorkspaceOverview {
  workspace: WorkspaceItem
  folders: FolderItem[]
  pages: PageItem[]
  members: WorkspaceMember[]
}

export type WorkspaceUpdate = Partial<Pick<WorkspaceItem, 'name' | 'description' | 'icon'>>
export type FolderUpdate = Partial<Pick<FolderItem, 'name' | 'description' | 'icon'>>
