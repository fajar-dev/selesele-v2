export const realtimeTopics = ['workspaces', 'folders', 'items', 'content', 'comments', 'members', 'groups', 'access', 'settings', 'templates', 'library', 'attachments', 'relations', 'conversations', 'notifications', 'activity', 'versions', 'presence', 'session'] as const
export type RealtimeTopic = typeof realtimeTopics[number]
/** No content, private object IDs, or membership details travel in invalidations. */
export interface RealtimeChange {
  workspaceId: string | null
  topics: RealtimeTopic[]
}
export type RealtimeFrame = { type: 'ready' } | { type: 'changes', changes: RealtimeChange[] } | { type: 'session-expired' }
export interface RealtimeScope {
  workspaceId?: string
  topics?: readonly RealtimeTopic[]
}
export function matchesRealtimeScope(scope: RealtimeScope, change: RealtimeChange) {
  return (!scope.workspaceId || !change.workspaceId || scope.workspaceId === change.workspaceId) && (!scope.topics || change.topics.some(topic => scope.topics!.includes(topic)))
}
