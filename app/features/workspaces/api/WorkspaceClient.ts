import type { WorkspaceUpdate, WorkspaceItem } from '#shared/contracts/workspace'
import type { ApiResponse } from '#shared/contracts/api'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class WorkspaceClient {
  constructor(private readonly http: ApiTransport) {}

  list() {
    return this.http.request<ApiResponse<WorkspaceItem[]>>('/workspaces')
  }

  get(id: string) {
    return this.http.request<ApiResponse<WorkspaceItem>>(`/workspaces/${encodeURIComponent(id)}`)
  }

  create(name: string) {
    return this.http.request<ApiResponse<WorkspaceItem>>('/workspaces', { method: 'POST', body: { name } })
  }

  update(id: string, body: WorkspaceUpdate) {
    return this.http.request<ApiResponse<WorkspaceItem>>(`/workspaces/${encodeURIComponent(id)}`, { method: 'PATCH', body })
  }

  delete(id: string) {
    return this.http.request(`/workspaces/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}
