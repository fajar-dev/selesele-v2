/** Infrastructure-only change capture. Business rules remain in application/domain classes. */
interface CaptureDefinition {
  table: string
  topic: string
  workspace: (row: string) => string
  user?: (row: string) => string
  fields?: string[]
  extra?: (row: string) => string
}
const itemWorkspace = (column: string) => (row: string) => `(SELECT workspace_id FROM items WHERE id = ${row}.${column})`
const memberWorkspace = (row: string) => `(SELECT workspace_id FROM workspace_members WHERE id = ${row}.member_id)`
const event = (workspace: string, user: string, topic: string) => `INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), ${workspace}, ${user}, '${topic}');`
export const captureDefinitions: CaptureDefinition[] = [
  { table: 'workspaces', topic: 'workspaces', workspace: row => `${row}.id`, fields: ['name', 'description', 'icon', 'deleted_at', 'archived_at', 'settings'], extra: row => `INSERT INTO realtime_events (id, workspace_id, user_id, topic) SELECT UUID(), ${row}.id, user_id, 'workspaces' FROM workspace_members WHERE workspace_id = ${row}.id AND user_id IS NOT NULL;` },
  { table: 'folders', topic: 'folders', workspace: row => `${row}.workspace_id` },
  { table: 'items', topic: 'items', workspace: row => `${row}.workspace_id`, fields: ['title', 'description', 'icon', 'folder_id', 'access_mode', 'archived_at', 'deleted_at'] },
  { table: 'item_documents', topic: 'content', workspace: itemWorkspace('item_id'), fields: ['markdown', 'state'] },
  { table: 'item_canvases', topic: 'content', workspace: itemWorkspace('item_id'), fields: ['revision'] },
  { table: 'comment_threads', topic: 'comments', workspace: itemWorkspace('item_id') },
  { table: 'comments', topic: 'comments', workspace: row => `(SELECT i.workspace_id FROM items i JOIN comment_threads t ON t.item_id = i.id WHERE t.id = ${row}.thread_id)` },
  { table: 'workspace_members', topic: 'members', workspace: row => `${row}.workspace_id`, fields: ['user_id', 'email', 'role', 'suspended_at'], extra: row => event(`${row}.workspace_id`, `${row}.user_id`, 'access') },
  { table: 'member_groups', topic: 'groups', workspace: row => `${row}.workspace_id` },
  { table: 'member_group_members', topic: 'groups', workspace: memberWorkspace },
  { table: 'resource_grants', topic: 'access', workspace: row => `${row}.workspace_id` },
  { table: 'item_preferences', topic: 'library', workspace: () => 'NULL', user: row => `${row}.user_id`, fields: ['favorite_at', 'visited_at'] },
  { table: 'item_links', topic: 'relations', workspace: itemWorkspace('source_id') },
  { table: 'item_versions', topic: 'versions', workspace: itemWorkspace('item_id') },
  { table: 'notifications', topic: 'notifications', workspace: () => 'NULL', user: row => `${row}.user_id` },
  { table: 'workspace_activity', topic: 'activity', workspace: row => `${row}.workspace_id` },
  { table: 'workspace_templates', topic: 'templates', workspace: row => `${row}.workspace_id` },
  { table: 'item_attachments', topic: 'attachments', workspace: itemWorkspace('item_id') },
  { table: 'related_items', topic: 'relations', workspace: itemWorkspace('source_id'), extra: row => event(itemWorkspace('target_id')(row), 'NULL', 'relations') },
  { table: 'saved_searches', topic: 'library', workspace: () => 'NULL', user: row => `${row}.user_id` },
  { table: 'conversations', topic: 'conversations', workspace: row => `${row}.workspace_id`, user: row => `${row}.user_id` },
  { table: 'conversation_messages', topic: 'conversations', workspace: row => `(SELECT workspace_id FROM conversations WHERE id = ${row}.conversation_id)`, user: row => `(SELECT user_id FROM conversations WHERE id = ${row}.conversation_id)` },
  { table: 'document_presence', topic: 'presence', workspace: itemWorkspace('item_id') },
  { table: 'canvas_presence', topic: 'presence', workspace: itemWorkspace('item_id') },
  { table: 'users', topic: 'session', workspace: () => 'NULL', user: row => `${row}.id`, fields: ['name', 'email', 'avatar', 'is_active', 'invitation_email'], extra: row => `INSERT INTO realtime_events (id, workspace_id, user_id, topic) SELECT UUID(), workspace_id, NULL, 'members' FROM workspace_members WHERE user_id = ${row}.id;` },
  { table: 'sessions', topic: 'session', workspace: () => 'NULL', user: row => `${row}.user_id` }
]
export function captureMigration() {
  const statements = ['INSERT INTO realtime_clock (id, sequence) VALUES (\'global\', 0);']
  for (const definition of captureDefinitions) {
    for (const operation of ['INSERT', 'UPDATE', 'DELETE']) {
      const row = operation === 'DELETE' ? 'OLD' : 'NEW'
      const body = event(definition.workspace(row), definition.user?.(row) || 'NULL', definition.topic) + (definition.extra?.(row) || '')
      const condition = operation === 'UPDATE' && definition.fields ? definition.fields.map(field => `NOT (NEW.${field} <=> OLD.${field})`).join(' OR ') : null
      // BEFORE DELETE keeps parent relationships available, including cascading deletes.
      statements.push(`CREATE TRIGGER capture_${definition.table}_${operation.toLowerCase()} ${operation === 'DELETE' ? 'BEFORE' : 'AFTER'} ${operation} ON ${definition.table} FOR EACH ROW BEGIN ${condition ? `IF ${condition} THEN ${body} END IF;` : body} END;`)
    }
  }
  statements.push(`CREATE TRIGGER capture_member_preferences AFTER UPDATE ON workspace_members FOR EACH ROW BEGIN IF NOT (NEW.notifications <=> OLD.notifications) THEN ${event('NEW.workspace_id', 'NEW.user_id', 'settings')} END IF; END;`)
  return statements.join('\n--> statement-breakpoint\n') + '\n'
}
