import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { LibraryEntry, ItemTemplate, PersonalLibrary, WorkspaceTemplateSummary } from '#shared/contracts/library'
import type { ContentItem } from '#shared/contracts/item'

export class LibraryClient {
  constructor(private readonly http: ApiTransport) {
  }

  search(q: string, workspaceId?: string) {
    return this.http.request<ApiResponse<LibraryEntry[]>>('/library/search', { query: { q, workspaceId } })
  }

  personal() {
    return this.http.request<ApiResponse<PersonalLibrary>>('/library/personal')
  }

  favorite(id: string, favorite: boolean) {
    return this.http.request(`/items/${id}/favorite`, { method: 'POST', body: { favorite } })
  }

  visit(id: string) {
    return this.http.request(`/items/${id}/visit`, { method: 'POST' })
  }

  backlinks(id: string) {
    return this.http.request<ApiResponse<LibraryEntry[]>>(`/items/${id}/backlinks`)
  }

  templates() {
    return this.http.request<ApiResponse<ItemTemplate[]>>('/templates')
  }

  workspaceTemplates(workspaceId: string) {
    return this.http.request<ApiResponse<WorkspaceTemplateSummary[]>>(`/workspaces/${workspaceId}/templates`)
  }

  saveTemplate(workspaceId: string, itemId: string, title: string, description: string) {
    return this.http.request(`/workspaces/${workspaceId}/templates/save`, { method: 'POST', body: { itemId, title, description: description.slice(0, 500) } })
  }

  removeTemplate(workspaceId: string, id: string) {
    return this.http.request(`/workspaces/${workspaceId}/templates/${id}`, { method: 'DELETE' })
  }

  createTemplate(workspaceId: string, templateId: string, folderId: string | null) {
    return this.http.request<ApiResponse<ContentItem>>(`/workspaces/${workspaceId}/templates`, { method: 'POST', body: { templateId, folderId } })
  }
}
