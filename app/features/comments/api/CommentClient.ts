import type { ApiResponse } from '#shared/contracts/api'
import type { CommentThreadInput, CommentThreadItem } from '#shared/contracts/comment'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class CommentClient {
  constructor(private readonly http: ApiTransport) {}

  private path(pageId: string, threadId?: string) {
    const base = `/pages/${encodeURIComponent(pageId)}/comments`
    return threadId ? `${base}/${encodeURIComponent(threadId)}` : base
  }

  list(pageId: string) {
    return this.http.request<ApiResponse<CommentThreadItem[]>>(this.path(pageId))
  }

  create(pageId: string, body: CommentThreadInput) {
    return this.http.request<ApiResponse<CommentThreadItem>>(this.path(pageId), { method: 'POST', body })
  }

  reply(pageId: string, threadId: string, body: string) {
    return this.http.request<ApiResponse<CommentThreadItem>>(`${this.path(pageId, threadId)}/replies`, { method: 'POST', body: { body } })
  }

  resolve(pageId: string, threadId: string, resolved: boolean) {
    return this.http.request<ApiResponse<CommentThreadItem>>(this.path(pageId, threadId), { method: 'PATCH', body: { resolved } })
  }

  delete(pageId: string, threadId: string) {
    return this.http.request(this.path(pageId, threadId), { method: 'DELETE' })
  }
}
