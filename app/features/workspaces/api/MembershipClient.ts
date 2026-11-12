import type { InviteRole } from '#shared/contracts/workspace'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class MembershipClient {
  constructor(private readonly http: ApiTransport) {}

  private path(workspaceId: string, userId: string) {
    return `/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`
  }

  changeRole(workspaceId: string, userId: string, role: InviteRole) {
    return this.http.request(this.path(workspaceId, userId), { method: 'PATCH', body: { role } })
  }

  remove(workspaceId: string, userId: string) {
    return this.http.request(this.path(workspaceId, userId), { method: 'DELETE' })
  }
}
