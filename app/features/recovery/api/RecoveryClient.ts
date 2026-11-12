import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { PageVersion, TrashItem, TrashKind } from '#shared/contracts/recovery'

export class RecoveryClient {
  constructor(private readonly http: ApiTransport) {}
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
    return this.http.request<ApiResponse<PageVersion[]>>(`/pages/${id}/versions`)
  }

  checkpoint(id: string) {
    return this.http.request(`/pages/${id}/versions`, { method: 'POST' })
  }

  version(pageId: string, id: string) {
    return this.http.request<ApiResponse<{ content: string }>>(`/pages/${pageId}/versions/${id}`)
  }

  restoreVersion(pageId: string, id: string) {
    return this.http.request(`/pages/${pageId}/versions/${id}/restore`, { method: 'POST' })
  }
}
