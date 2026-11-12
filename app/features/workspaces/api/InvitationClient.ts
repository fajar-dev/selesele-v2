import type { ApiResponse } from '#shared/contracts/api'
import type { InviteRole, WorkspaceInvitation } from '#shared/contracts/workspace'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class InvitationClient {
  constructor(private readonly http: ApiTransport) {}

  private path(workspaceId: string, invitationId?: string) {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/invitations`
    return invitationId ? `${base}/${encodeURIComponent(invitationId)}` : base
  }

  list(workspaceId: string) {
    return this.http.request<ApiResponse<WorkspaceInvitation[]>>(this.path(workspaceId))
  }

  invite(workspaceId: string, email: string, role: InviteRole) {
    return this.http.request(this.path(workspaceId), { method: 'POST', body: { email, role } })
  }

  cancel(workspaceId: string, invitationId: string) {
    return this.http.request(this.path(workspaceId, invitationId), { method: 'DELETE' })
  }

  inbox() {
    return this.http.request<ApiResponse<WorkspaceInvitation[]>>('/invitations')
  }

  accept(invitationId: string) {
    return this.http.request<ApiResponse<{ workspaceId: string }>>(`/invitations/${encodeURIComponent(invitationId)}/accept`, { method: 'POST' })
  }

  decline(invitationId: string) {
    return this.http.request(`/invitations/${encodeURIComponent(invitationId)}`, { method: 'DELETE' })
  }
}
