import type { PageItem } from './page'

import type { WorkspaceRole, InviteRole } from '../kernel/workspace'

export type { WorkspaceRole, InviteRole } from '../kernel/workspace'

export interface WorkspaceItem {
  id: string
  name: string
  icon: string
  role: WorkspaceRole
  createdAt: string
  updatedAt: string
}

export interface FolderItem {
  id: string
  workspaceId: string
  name: string
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
