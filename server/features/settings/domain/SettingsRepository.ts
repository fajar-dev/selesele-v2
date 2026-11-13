import type { WorkspaceSettingsChanges, WorkspaceNotificationPreferences, WorkspaceActivity } from '../../../../shared/kernel/workspaceSettings'

interface WorkspaceExportPage {
  id: string
  title: string
  folderId: string | null
  markdown: string
}
export interface WorkspaceExportData {
  name: string
  attachments: string[]
  pages: WorkspaceExportPage[]
  folders: {
    id: string
    name: string
  }[]
}
export interface SettingsRepository {
  save(workspaceId: string, userId: string, settings: WorkspaceSettingsChanges): Promise<void>
  notifications(workspaceId: string, userId: string): Promise<WorkspaceNotificationPreferences>
  saveNotifications(workspaceId: string, userId: string, preferences: WorkspaceNotificationPreferences): Promise<void>
  activity(workspaceId: string, userId: string, cursor?: string, memberId?: string): Promise<WorkspaceActivity[]>
  usage(workspaceId: string, userId: string): Promise<{
    pages: number
    folders: number
    members: number
    documentBytes: number
  }>
  exportData(workspaceId: string, userId: string): Promise<WorkspaceExportData>
  archive(workspaceId: string, userId: string, archived: boolean): Promise<void>
  transfer(workspaceId: string, actorId: string, targetId: string): Promise<boolean>
  leave(workspaceId: string, userId: string): Promise<boolean>
}
