import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { ConversationDetail, ConversationSummary } from '#shared/contracts/conversation'

export class ConversationClient {
  constructor(private readonly http: ApiTransport) { }
  private path(workspaceId: string, id?: string) {
    return `/workspaces/${workspaceId}/conversations${id ? `/${id}` : ''}`
  }

  list(workspaceId: string, q = '') {
    return this.http.request<ApiResponse<ConversationSummary[]>>(this.path(workspaceId), { query: { q } })
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

  pin(workspaceId: string, id: string, pinned: boolean) {
    return this.http.request(this.path(workspaceId, id), { method: 'PATCH', body: { pinned } })
  }

  async stream(workspaceId: string, id: string, question: string, revision: number, signal: AbortSignal, delta: (text: string) => void) {
    const body = await this.http.request<ReadableStream<Uint8Array>>(`${this.path(workspaceId, id)}/stream`, { method: 'POST', body: { question, revision }, responseType: 'stream', signal })
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = '', result: ConversationDetail | undefined
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        buffer += decoder.decode(value, { stream: true })
        let end: number
        while ((end = buffer.indexOf('\n')) !== -1) {
          const event = JSON.parse(buffer.slice(0, end))
          buffer = buffer.slice(end + 1)
          if (event.type === 'delta') {
            delta(event.text)
          }
          if (event.type === 'error') {
            throw new Error(event.message)
          }
          if (event.type === 'done') {
            result = event.conversation
          }
        }
      }
      if (!result) {
        throw new Error('The answer was interrupted. Retry your question.')
      }
      return result
    } finally {
      await reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  }

  remove(workspaceId: string, id: string) {
    return this.http.request(this.path(workspaceId, id), { method: 'DELETE' })
  }

  ask(workspaceId: string, id: string, question: string, revision: number) {
    return this.http.request<ApiResponse<ConversationDetail>>(`${this.path(workspaceId, id)}/messages`, { method: 'POST', body: { question, revision } })
  }
}
