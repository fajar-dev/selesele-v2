import type { ApiResponse } from '#shared/contracts/api'
import type { CommentThreadInput, CommentThreadItem } from '#shared/contracts/comment'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class CommentClient {
  constructor(private readonly http: ApiTransport) {
  }

  private path(itemId: string, threadId?: string) {
    const base = `/items/${encodeURIComponent(itemId)}/comments`
    return threadId ? `${base}/${encodeURIComponent(threadId)}` : base
  }

  list(itemId: string) {
    return this.http.request<ApiResponse<CommentThreadItem[]>>(this.path(itemId))
  }

  create(itemId: string, body: CommentThreadInput) {
    return this.http.request<ApiResponse<CommentThreadItem>>(this.path(itemId), { method: 'POST', body })
  }

  reply(itemId: string, threadId: string, body: string) {
    return this.http.request<ApiResponse<CommentThreadItem>>(`${this.path(itemId, threadId)}/replies`, { method: 'POST', body: { body } })
  }

  resolve(itemId: string, threadId: string, resolved: boolean) {
    return this.http.request<ApiResponse<CommentThreadItem>>(this.path(itemId, threadId), { method: 'PATCH', body: { resolved } })
  }

  delete(itemId: string, threadId: string) {
    return this.http.request(this.path(itemId, threadId), { method: 'DELETE' })
  }
}
