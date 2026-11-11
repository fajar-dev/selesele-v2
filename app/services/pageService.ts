import type { ApiResponse } from '#shared/types/api'
import type { PageInput, PageItem, PageUpdate } from '#shared/types/page'
import { apiService } from './apiService'

export class PageService {
  private path(id: string, suffix = '') {
    return `/pages/${encodeURIComponent(id)}${suffix}`
  }

  create(workspaceId: string, body: PageInput) {
    return apiService.request<ApiResponse<PageItem>>(`/workspaces/${encodeURIComponent(workspaceId)}/pages`, { method: 'POST', body })
  }

  get(id: string) {
    return apiService.request<ApiResponse<PageItem>>(this.path(id))
  }

  update(id: string, body: PageUpdate) {
    return apiService.request<ApiResponse<PageItem>>(this.path(id), { method: 'PUT', body })
  }

  move(id: string, folderId: string | null) {
    return apiService.request<ApiResponse<PageItem>>(this.path(id, '/location'), { method: 'PATCH', body: { folderId } })
  }

  replaceContent(id: string, content: string) {
    return apiService.request(this.path(id, '/content'), { method: 'POST', body: { content } })
  }

  getContent(id: string) {
    return apiService.request<ApiResponse<{ content: string }>>(this.path(id, '/content'))
  }

  downloadMarkdown(id: string) {
    return apiService.download(this.path(id, '/md'))
  }

  delete(id: string) {
    return apiService.request(this.path(id), { method: 'DELETE' })
  }
}

export const pageService = new PageService()
