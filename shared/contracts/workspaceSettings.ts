import type { WorkspaceActivity, WorkspaceNotificationPreferences, WorkspaceSettings } from '../kernel/workspaceSettings'

export type { WorkspaceNotificationPreferences, WorkspaceSettings, WorkspaceSettingsChanges } from '../kernel/workspaceSettings'
export interface WorkspaceSettingsOverview {
  settings: WorkspaceSettings
  notifications: WorkspaceNotificationPreferences
  archivedAt: string | null
}
export interface WorkspaceUsage {
  pages: number
  folders: number
  members: number
  documentBytes: number
  attachmentBytes: number
}
export interface WorkspaceActivityPage {
  items: WorkspaceActivity[]
  nextCursor: string | null
}
