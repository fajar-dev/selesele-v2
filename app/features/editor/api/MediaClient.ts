import type { ApiTransport } from '~/core/http/ApiTransport'

export class MediaClient {
  constructor(private readonly http: ApiTransport) {
  }

  upload(file: File, itemId: string) {
    const body = new FormData()
    body.append('file', file)
    body.append('itemId', itemId)
    return this.http.request<{
      url: string
    }>('/upload', { method: 'POST', body })
  }
}
