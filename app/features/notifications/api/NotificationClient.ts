import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { NotificationItem } from '#shared/contracts/notification'

export class NotificationClient {
  constructor(private readonly http: ApiTransport) {}
  list() {
    return this.http.request<ApiResponse<NotificationItem[]>>('/notifications')
  }

  read(id?: string) {
    return this.http.request(id ? `/notifications/${id}` : '/notifications', { method: 'PATCH' })
  }
}
