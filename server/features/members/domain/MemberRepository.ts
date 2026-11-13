import type { MemberItem, MemberGroup, MemberDirectory, MemberAddInput, MemberAddResult } from '../../../../shared/kernel/member'
import type { InviteRole } from '../../../../shared/kernel/workspace'

export interface MemberQuery {
  q: string
  role?: string
  status?: string
  groupId?: string
  cursor?: string
}
export interface MemberRepository {
  roster(workspaceId: string): Promise<MemberItem[]>
  directory(workspaceId: string, query: MemberQuery): Promise<MemberDirectory>
  find(workspaceId: string, memberId: string): Promise<MemberItem | null>
  add(workspaceId: string, actorId: string, input: MemberAddInput): Promise<MemberAddResult[]>
  change(workspaceId: string, memberId: string, actorId: string, input: {
    role?: InviteRole
    suspended?: boolean
    remove?: boolean
  }): Promise<void>
  groups(workspaceId: string): Promise<MemberGroup[]>
  saveGroup(workspaceId: string, actorId: string, groupId: string | null, input: Omit<MemberGroup, 'id'>): Promise<void>
  deleteGroup(workspaceId: string, actorId: string, groupId: string): Promise<void>
}
