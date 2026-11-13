import type { NotificationItem } from './notification'
import type { WorkspaceRole } from './workspace'

export type WorkspaceCapability = 'inviteMembers' | 'createItems' | 'createFolders' | 'deleteContent'
type PermissionAudience = 'managers' | 'members'
export interface WorkspaceSettings {
  permissions: Record<WorkspaceCapability, PermissionAudience>
  homeItemId: string | null
  trashRetentionDays: 0 | 7 | 30 | 90
}
export type WorkspaceSettingsChanges = Partial<WorkspaceSettings>
export interface WorkspaceNotificationPreferences {
  email: Record<NotificationItem['kind'], boolean>
  delivery: 'immediate' | 'daily'
}
export const defaultWorkspaceSettings = (): WorkspaceSettings => ({
  permissions: { inviteMembers: 'managers', createItems: 'members', createFolders: 'members', deleteContent: 'members' }, homeItemId: null, trashRetentionDays: 0
})
export const defaultNotificationPreferences = (): WorkspaceNotificationPreferences => ({ email: { invitation: true, comment: true, reply: true, mention: true }, delivery: 'immediate' })
export function allowsWorkspaceAction(role: WorkspaceRole, settings: WorkspaceSettings, capability: WorkspaceCapability): boolean {
  return role !== 'viewer' && (role !== 'member' || settings.permissions[capability] === 'members')
}
export type WorkspaceActivityAction = 'member.added' | 'member.suspended' | 'member.restored' | 'group.updated' | 'group.deleted' | 'resource.access_changed' | 'workspace.updated' | 'workspace.archived' | 'workspace.unarchived' | 'workspace.transferred' | 'workspace.left' | 'workspace.deleted' | 'settings.updated' | 'member.removed' | 'member.role_changed' | 'item.archived' | 'item.unarchived' | 'item.created' | 'item.updated' | 'item.moved' | 'item.deleted' | 'folder.created' | 'folder.updated' | 'folder.deleted' | 'content.restored' | 'content.purged'
export interface WorkspaceActivity {
  id: string
  actorName: string
  action: WorkspaceActivityAction
  target: string
  createdAt: string
}
