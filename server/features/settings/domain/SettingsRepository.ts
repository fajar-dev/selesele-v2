import type { ItemKind, CanvasContent } from '../../../../shared/kernel/content'
import type { WorkspaceSettingsChanges, WorkspaceNotificationPreferences, WorkspaceActivity } from '../../../../shared/kernel/workspaceSettings'

interface WorkspaceExportItem {
  kind: ItemKind
  canvas: CanvasContent | null
  id: string
  title: string
  folderId: string | null
  markdown: string
}
export interface WorkspaceExportData {
  name: string
  attachments: string[]
  items: WorkspaceExportItem[]
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
    items: number
    folders: number
    members: number
    documentBytes: number
  }>
  exportData(workspaceId: string, userId: string): Promise<WorkspaceExportData>
  archive(workspaceId: string, userId: string, archived: boolean): Promise<void>
  transfer(workspaceId: string, actorId: string, targetId: string): Promise<boolean>
  leave(workspaceId: string, userId: string): Promise<boolean>
}
