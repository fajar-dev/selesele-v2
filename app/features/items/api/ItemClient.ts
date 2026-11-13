import type { ApiResponse } from '#shared/contracts/api'
import type { MoveImpact } from '#shared/kernel/access'
import type { ItemInput, ContentItem, ItemUpdate } from '#shared/contracts/item'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class ItemClient {
  constructor(private readonly http: ApiTransport) {
  }

  private path(id: string, suffix = '') {
    return `/items/${encodeURIComponent(id)}${suffix}`
  }

  list(workspaceId: string) {
    return this.http.request<ApiResponse<ContentItem[]>>(`/workspaces/${encodeURIComponent(workspaceId)}/items`)
  }

  create(workspaceId: string, body: ItemInput) {
    return this.http.request<ApiResponse<ContentItem>>(`/workspaces/${encodeURIComponent(workspaceId)}/items`, { method: 'POST', body })
  }

  get(id: string) {
    return this.http.request<ApiResponse<ContentItem>>(this.path(id))
  }

  update(id: string, body: ItemUpdate) {
    return this.http.request<ApiResponse<ContentItem>>(this.path(id), { method: 'PUT', body })
  }

  move(id: string, folderId: string | null, acknowledgement?: string) {
    return this.http.request<ApiResponse<ContentItem>>(this.path(id, '/location'), { method: 'PATCH', body: { folderId, acknowledgement } })
  }

  previewMove(id: string, folderId: string | null) {
    return this.http.request<ApiResponse<MoveImpact>>(this.path(id, '/location/preview'), { method: 'POST', body: { folderId } })
  }

  content(id: string) {
    return this.http.request<ApiResponse<{
      content: string
    }>>(this.path(id, '/content'))
  }

  archive(id: string, archived: boolean) {
    return this.http.request<ApiResponse<ContentItem>>(this.path(id, '/archive'), { method: 'POST', body: { archived } })
  }

  state(id: string) {
    return this.http.request<ApiResponse<string | null>>(this.path(id, '/state'))
  }

  downloadMarkdown(id: string) {
    return this.http.download(this.path(id, '/md'))
  }

  delete(id: string) {
    return this.http.request(this.path(id), { method: 'DELETE' })
  }
}
