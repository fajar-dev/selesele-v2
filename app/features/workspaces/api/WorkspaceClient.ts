import type { ApiResponse } from '#shared/contracts/api'
import type { WorkspaceItem, WorkspaceOverview } from '#shared/contracts/workspace'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class WorkspaceClient {
  constructor(private readonly http: ApiTransport) {}

  list() {
    return this.http.request<ApiResponse<WorkspaceItem[]>>('/workspaces')
  }

  get(id: string) {
    return this.http.request<ApiResponse<WorkspaceOverview>>(`/workspaces/${encodeURIComponent(id)}`)
  }

  create(name: string) {
    return this.http.request<ApiResponse<WorkspaceItem>>('/workspaces', { method: 'POST', body: { name } })
  }

  rename(id: string, name: string) {
    return this.http.request(`/workspaces/${encodeURIComponent(id)}`, { method: 'PATCH', body: { name } })
  }

  delete(id: string) {
    return this.http.request(`/workspaces/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}
