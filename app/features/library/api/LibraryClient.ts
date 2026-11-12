import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { KnowledgeAnswer, LibraryEntry, PageTemplate, PersonalLibrary } from '#shared/contracts/library'
import type { PageItem } from '#shared/contracts/page'

export class LibraryClient {
  constructor(private readonly http: ApiTransport) {}
  search(q: string, workspaceId?: string) {
    return this.http.request<ApiResponse<LibraryEntry[]>>('/library/search', { query: { q, workspaceId } })
  }

  personal() {
    return this.http.request<ApiResponse<PersonalLibrary>>('/library/personal')
  }

  favorite(id: string, favorite: boolean) {
    return this.http.request(`/pages/${id}/favorite`, { method: 'POST', body: { favorite } })
  }

  visit(id: string) {
    return this.http.request(`/pages/${id}/visit`, { method: 'POST' })
  }

  backlinks(id: string) {
    return this.http.request<ApiResponse<LibraryEntry[]>>(`/pages/${id}/backlinks`)
  }

  templates() {
    return this.http.request<ApiResponse<PageTemplate[]>>('/templates')
  }

  createTemplate(workspaceId: string, templateId: string, folderId: string | null) {
    return this.http.request<ApiResponse<PageItem>>(`/workspaces/${workspaceId}/templates`, { method: 'POST', body: { templateId, folderId } })
  }

  answer(question: string, workspaceId: string) {
    return this.http.request<ApiResponse<KnowledgeAnswer>>('/questions', { method: 'POST', body: { question, workspaceId } })
  }
}
