import type { InviteRole, WorkspaceRole } from './workspace'
import type { AccessLevel, ResourceKind } from './access'

export interface MemberItem {
  id: string
  userId: string | null
  email: string
  name: string | null
  avatar: string | null
  role: WorkspaceRole
  joinedAt: string
  lastActiveAt: string | null
  suspendedAt: string | null
  invitedBy: string | null
  groups: {
    id: string
    name: string
  }[]
}
export interface MemberGroup {
  id: string
  name: string
  description: string
  memberIds: string[]
}
export interface MemberDirectory {
  items: MemberItem[]
  nextCursor: string | null
  total: number
}
export interface MemberAddInput {
  emails: string[]
  role: InviteRole
  groupIds: string[]
  grants: {
    kind: ResourceKind
    resourceId: string
    level: AccessLevel
    expiresAt: string | null
  }[]
}
export interface MemberAddResult {
  email: string
  status: 'added' | 'exists' | 'failed'
  message: string
}
export type MemberBulkAction = 'role' | 'suspend' | 'restore' | 'remove'
