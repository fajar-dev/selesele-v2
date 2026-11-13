import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { ResourceKind, ResourcePolicy } from '#shared/kernel/access'

export class ResourceAccessClient {
  constructor(private readonly http: ApiTransport) {
  }

  private path(workspaceId: string, kind: ResourceKind, id: string) {
    return kind === 'item' ? `/items/${id}/access` : `/workspaces/${workspaceId}/folders/${id}/access`
  }

  get(workspaceId: string, kind: ResourceKind, id: string) {
    return this.http.request<ApiResponse<ResourcePolicy>>(this.path(workspaceId, kind, id))
  }

  save(workspaceId: string, kind: ResourceKind, id: string, body: Pick<ResourcePolicy, 'mode' | 'grants'>) {
    return this.http.request(this.path(workspaceId, kind, id), { method: 'PUT', body: { mode: body.mode, grants: body.grants.map(({ memberId, groupId, level, expiresAt }) => ({ memberId, groupId, level, expiresAt })) } })
  }
}
