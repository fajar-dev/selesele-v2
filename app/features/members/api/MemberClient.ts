import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { MemberItem, MemberDirectory, MemberGroup, MemberAddInput, MemberAddResult, MemberBulkAction, MemberResourceAccess, AccessLevel, ResourceKind } from '#shared/contracts/member'
import type { InviteRole } from '#shared/contracts/workspace'
import type { WorkspaceActivityPage } from '#shared/contracts/workspaceSettings'

export class MemberClient {
  constructor(private readonly http: ApiTransport) { }
  private path(id: string) {
    return `/workspaces/${id}`
  }

  roster(id: string) {
    return this.http.request<ApiResponse<MemberItem[]>>(`${this.path(id)}/members`)
  }

  directory(id: string, query: Record<string, string | undefined>) {
    return this.http.request<ApiResponse<MemberDirectory>>(`${this.path(id)}/members/directory`, { query })
  }

  add(id: string, body: MemberAddInput) {
    return this.http.request<ApiResponse<MemberAddResult[]>>(`${this.path(id)}/members`, { method: 'POST', body })
  }

  bulk(id: string, memberIds: string[], action: MemberBulkAction, role?: InviteRole) {
    return this.http.request<ApiResponse<{
      memberId: string
      success: boolean
      message: string
    }[]>>(`${this.path(id)}/members/bulk`, { method: 'POST', body: { memberIds, action, role } })
  }

  change(id: string, memberId: string, body: {
    role?: InviteRole
    suspended?: boolean
  }) {
    return this.http.request(`${this.path(id)}/members/${memberId}`, { method: 'PATCH', body })
  }

  remove(id: string, memberId: string) {
    return this.http.request(`${this.path(id)}/members/${memberId}`, { method: 'DELETE' })
  }

  groups(id: string) {
    return this.http.request<ApiResponse<MemberGroup[]>>(`${this.path(id)}/groups`)
  }

  saveGroup(id: string, groupId: string | null, body: Omit<MemberGroup, 'id'>) {
    return this.http.request(`${this.path(id)}/groups${groupId ? `/${groupId}` : ''}`, { method: groupId ? 'PUT' : 'POST', body })
  }

  deleteGroup(id: string, groupId: string) {
    return this.http.request(`${this.path(id)}/groups/${groupId}`, { method: 'DELETE' })
  }

  access(id: string, memberId: string) {
    return this.http.request<ApiResponse<MemberResourceAccess[]>>(`${this.path(id)}/members/${memberId}/access`)
  }

  grant(id: string, memberId: string, body: {
    kind: ResourceKind
    resourceId: string
    level: AccessLevel | null
    expiresAt: string | null
  }) {
    return this.http.request(`${this.path(id)}/members/${memberId}/access`, { method: 'PUT', body })
  }

  history(id: string, memberId: string, cursor?: string) {
    return this.http.request<ApiResponse<WorkspaceActivityPage>>(`${this.path(id)}/members/${memberId}/history`, { query: { cursor } })
  }
}
