import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/model/api'
import type { ItemAttachment, ItemRelation, ObjectReference, SavedSearch } from '#shared/model/itemResources'

export class ItemResourceClient {
  constructor(private readonly http: ApiTransport) { }
  list(itemId: string) {
    return this.http.request<ApiResponse<{
      attachments: ItemAttachment[]
      relations: ItemRelation[]
    }>>(`/items/${itemId}/resources`)
  }

  attach(itemId: string, file: File, anchor: ObjectReference | null = null) {
    const body = new FormData()
    body.set('file', file)
    if (anchor) {
      body.set('anchor', JSON.stringify(anchor))
    }
    return this.http.request<ApiResponse<ItemAttachment>>(`/items/${itemId}/attachments`, { method: 'POST', body })
  }

  detach(itemId: string, id: string) {
    return this.http.request(`/items/${itemId}/attachments/${id}`, { method: 'DELETE' })
  }

  relate(itemId: string, targetId: string, sourceAnchor: ObjectReference | null, targetAnchor: ObjectReference | null, label: string) {
    return this.http.request(`/items/${itemId}/relations`, { method: 'POST', body: { targetId, sourceAnchor, targetAnchor, label } })
  }

  unlink(itemId: string, id: string) {
    return this.http.request(`/items/${itemId}/relations/${id}`, { method: 'DELETE' })
  }

  searches() {
    return this.http.request<ApiResponse<SavedSearch[]>>('/library/searches')
  }

  saveSearch(value: Omit<SavedSearch, 'id'>) {
    return this.http.request('/library/searches', { method: 'POST', body: value })
  }

  removeSearch(id: string) {
    return this.http.request(`/library/searches/${id}`, { method: 'DELETE' })
  }
}
