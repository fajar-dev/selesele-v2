import type { ApiResponse } from '#shared/contracts/api'
import type { FolderItem } from '#shared/contracts/workspace'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class FolderClient {
  constructor(private readonly http: ApiTransport) {}

  private path(workspaceId: string, folderId?: string) {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/folders`
    return folderId ? `${base}/${encodeURIComponent(folderId)}` : base
  }

  create(workspaceId: string, name: string) {
    return this.http.request<ApiResponse<FolderItem>>(this.path(workspaceId), { method: 'POST', body: { name } })
  }

  rename(workspaceId: string, folderId: string, name: string) {
    return this.http.request(this.path(workspaceId, folderId), { method: 'PATCH', body: { name } })
  }

  delete(workspaceId: string, folderId: string) {
    return this.http.request(this.path(workspaceId, folderId), { method: 'DELETE' })
  }
}
