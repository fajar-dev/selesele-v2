import type { ApiResponse } from '#shared/contracts/api'
import type { PageInput, PageItem, PageUpdate } from '#shared/contracts/page'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class PageClient {
  constructor(private readonly http: ApiTransport) {}

  private path(id: string, suffix = '') {
    return `/pages/${encodeURIComponent(id)}${suffix}`
  }

  list(workspaceId: string) {
    return this.http.request<ApiResponse<PageItem[]>>(`/workspaces/${encodeURIComponent(workspaceId)}/pages`)
  }

  create(workspaceId: string, body: PageInput) {
    return this.http.request<ApiResponse<PageItem>>(`/workspaces/${encodeURIComponent(workspaceId)}/pages`, { method: 'POST', body })
  }

  get(id: string) {
    return this.http.request<ApiResponse<PageItem>>(this.path(id))
  }

  update(id: string, body: PageUpdate) {
    return this.http.request<ApiResponse<PageItem>>(this.path(id), { method: 'PUT', body })
  }

  move(id: string, folderId: string | null) {
    return this.http.request<ApiResponse<PageItem>>(this.path(id, '/location'), { method: 'PATCH', body: { folderId } })
  }

  replaceContent(id: string, content: string) {
    return this.http.request(this.path(id, '/content'), { method: 'POST', body: { content } })
  }

  getContent(id: string) {
    return this.http.request<ApiResponse<{ content: string }>>(this.path(id, '/content'))
  }

  downloadMarkdown(id: string) {
    return this.http.download(this.path(id, '/md'))
  }

  delete(id: string) {
    return this.http.request(this.path(id), { method: 'DELETE' })
  }
}
