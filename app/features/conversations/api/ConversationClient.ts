import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { ConversationDetail, ConversationSummary } from '#shared/contracts/conversation'

export class ConversationClient {
  constructor(private readonly http: ApiTransport) { }
  private path(workspaceId: string, id?: string) {
    return `/workspaces/${workspaceId}/conversations${id ? `/${id}` : ''}`
  }

  list(workspaceId: string) {
    return this.http.request<ApiResponse<ConversationSummary[]>>(this.path(workspaceId))
  }

  get(workspaceId: string, id: string) {
    return this.http.request<ApiResponse<ConversationDetail>>(this.path(workspaceId, id))
  }

  create(workspaceId: string) {
    return this.http.request<ApiResponse<ConversationSummary>>(this.path(workspaceId), { method: 'POST' })
  }

  rename(workspaceId: string, id: string, title: string) {
    return this.http.request(this.path(workspaceId, id), { method: 'PATCH', body: { title } })
  }

  remove(workspaceId: string, id: string) {
    return this.http.request(this.path(workspaceId, id), { method: 'DELETE' })
  }

  ask(workspaceId: string, id: string, question: string, revision: number) {
    return this.http.request<ApiResponse<ConversationDetail>>(`${this.path(workspaceId, id)}/messages`, { method: 'POST', body: { question, revision } })
  }
}
