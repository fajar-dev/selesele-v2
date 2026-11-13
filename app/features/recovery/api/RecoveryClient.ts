import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { ItemVersion, TrashItem, TrashKind } from '#shared/contracts/recovery'

export class RecoveryClient {
  constructor(private readonly http: ApiTransport) {
  }

  trash() {
    return this.http.request<ApiResponse<TrashItem[]>>('/trash')
  }

  restore(kind: TrashKind, id: string) {
    return this.http.request(`/trash/${kind}/${id}/restore`, { method: 'POST' })
  }

  purge(kind: TrashKind, id: string) {
    return this.http.request(`/trash/${kind}/${id}`, { method: 'DELETE' })
  }

  versions(id: string) {
    return this.http.request<ApiResponse<ItemVersion[]>>(`/items/${id}/versions`)
  }

  checkpoint(id: string) {
    return this.http.request(`/items/${id}/versions`, { method: 'POST' })
  }

  version(itemId: string, id: string) {
    return this.http.request<ApiResponse<{
      content: string
    }>>(`/items/${itemId}/versions/${id}`)
  }

  restoreVersion(itemId: string, id: string) {
    return this.http.request(`/items/${itemId}/versions/${id}/restore`, { method: 'POST' })
  }
}
