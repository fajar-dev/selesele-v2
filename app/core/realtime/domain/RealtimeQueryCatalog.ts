import type { RealtimeScope, RealtimeTopic } from '#shared/model/realtime'

const security: RealtimeTopic[] = ['access', 'members', 'groups', 'folders', 'session']
/** Explicit dependency vocabulary for every server-backed screen; unknown keys fail audits. */
export class RealtimeQueryCatalog {
  describe(key: string): RealtimeScope {
    if (key === 'notifications') {
      return { topics: ['notifications', ...security, 'workspaces', 'items'] }
    }
    if (key === 'trash') {
      return { topics: ['items', 'folders', 'workspaces', ...security] }
    }
    if (key === 'library:personal') {
      return { topics: ['library', 'items', 'content', 'folders', 'workspaces', ...security] }
    }
    if (key === 'library:my-tasks') {
      return { topics: ['content', 'items', 'workspaces', ...security] }
    }
    if (key === 'library:search' || key === 'item-link-picker') {
      return { topics: ['items', 'content', 'folders', 'workspaces', ...security] }
    }
    if (key === 'workspaces:directory' || key === 'search:workspaces') {
      return { topics: ['workspaces', ...security] }
    }
    if (key === 'search:saved') {
      return { topics: ['library', 'session'] }
    }
    if (key === 'library:templates') {
      return { topics: ['templates'] }
    }
    const parts = key.split(':'), prefix = parts[0]!, id = parts[1]
    if (prefix === 'workspaces') {
      const topic = parts[2] === 'items' ? 'items' : parts[2] === 'folders' ? 'folders' : parts[2] === 'members' ? 'members' : 'workspaces'
      return { workspaceId: id, topics: [topic, ...(topic === 'items' ? ['content' as const] : []), 'workspaces', 'settings', ...security] }
    }
    const scoped: Record<string, RealtimeTopic[]> = {
      'workspace-settings': ['workspaces', 'settings'], 'workspace-activity': ['activity'], 'workspace-usage': ['items', 'content', 'folders', 'members', 'attachments'],
      'workspace-templates': ['templates', 'items'], 'conversations': ['conversations', 'items', 'content'],
      'member-directory': ['members', 'groups'], 'member-groups': ['groups', 'members'], 'member-access': ['items', 'folders'], 'member-history': ['activity']
    }
    if (scoped[prefix]) {
      return { workspaceId: id, topics: [...scoped[prefix], ...security] }
    }
    const resources: Record<string, RealtimeTopic[]> = {
      'items': ['items', 'settings', 'workspaces'], 'canvas': ['content', 'items', 'settings', 'workspaces'], 'reader-content': ['content', 'items', 'workspaces'],
      'versions': ['versions', 'content', 'items'], 'backlinks': ['relations', 'items', 'content'], 'resource-policy': ['access', 'groups', 'members']
    }
    if (resources[prefix]) {
      return { topics: [...resources[prefix], ...security] }
    }
    throw new Error(`Missing realtime query dependency: ${key}`)
  }
}
