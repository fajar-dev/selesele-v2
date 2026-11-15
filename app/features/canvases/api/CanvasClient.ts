import type { CanvasPresence } from '#shared/model/presence'
import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/model/api'
import type { CanvasContent, CanvasSnapshot } from '#shared/model/content'

export class CanvasClient {
  constructor(private readonly http: ApiTransport) {
  }

  get(id: string) {
    return this.http.request<ApiResponse<CanvasSnapshot>>(`/items/${id}/canvas`)
  }

  save(id: string, content: CanvasContent, revision: number, base?: CanvasContent) {
    return this.http.request<ApiResponse<CanvasSnapshot>>(`/items/${id}/canvas`, { method: 'PUT', body: { content, revision, base } })
  }

  presence(id: string) {
    return this.http.request<ApiResponse<CanvasPresence[]>>(`/items/${id}/presence`)
  }

  heartbeat(id: string, sessionId: string, cursor: CanvasPresence['cursor'], selected: string[], leave = false) {
    return this.http.request<ApiResponse<CanvasPresence[]>>(`/items/${id}/presence`, { method: 'POST', body: { sessionId, cursor, selected, leave } })
  }
}
