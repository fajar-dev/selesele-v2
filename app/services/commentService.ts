import type { ApiResponse } from '#shared/types/api'
import type { CommentThreadInput, CommentThreadItem } from '#shared/types/comment'
import { apiService } from './apiService'

export class CommentService {
  private path(pageId: string, threadId?: string) {
    const base = `/pages/${encodeURIComponent(pageId)}/comments`
    return threadId ? `${base}/${encodeURIComponent(threadId)}` : base
  }

  list(pageId: string) {
    return apiService.request<ApiResponse<CommentThreadItem[]>>(this.path(pageId))
  }

  create(pageId: string, body: CommentThreadInput) {
    return apiService.request<ApiResponse<CommentThreadItem>>(this.path(pageId), { method: 'POST', body })
  }

  reply(pageId: string, threadId: string, body: string) {
    return apiService.request<ApiResponse<CommentThreadItem>>(`${this.path(pageId, threadId)}/replies`, { method: 'POST', body: { body } })
  }

  resolve(pageId: string, threadId: string, resolved: boolean) {
    return apiService.request<ApiResponse<CommentThreadItem>>(this.path(pageId, threadId), { method: 'PATCH', body: { resolved } })
  }

  delete(pageId: string, threadId: string) {
    return apiService.request(this.path(pageId, threadId), { method: 'DELETE' })
  }
}
export const commentService = new CommentService()
