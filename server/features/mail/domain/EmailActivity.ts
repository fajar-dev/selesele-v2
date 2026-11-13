import type { InviteRole } from '../../../../shared/kernel/workspace'
/** A bounded snapshot of the activity that triggered this email. */
export interface EmailActivity {
  actorName: string
  workspaceName: string
  itemTitle?: string
  threadId?: string
  body?: string
  quote?: string
  workspaceDescription?: string
  role?: InviteRole
}
export function emailExcerpt(value: string, limit = 1200): string {
  const characters = Array.from(value.trim())
  return characters.length > limit ? `${characters.slice(0, limit).join('')}…` : characters.join('')
}
