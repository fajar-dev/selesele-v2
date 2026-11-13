import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { CanvasContent, CanvasSnapshot } from '#shared/kernel/content'

export class CanvasClient {
  constructor(private readonly http: ApiTransport) {
  }

  get(id: string) {
    return this.http.request<ApiResponse<CanvasSnapshot>>(`/items/${id}/canvas`)
  }

  save(id: string, content: CanvasContent, revision: number) {
    return this.http.request<ApiResponse<CanvasSnapshot>>(`/items/${id}/canvas`, { method: 'PUT', body: { content, revision } })
  }
}
