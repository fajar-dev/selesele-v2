import type { ApiTransport } from '~/core/http/ApiTransport'

export class MediaClient {
  constructor(private readonly http: ApiTransport) {}

  upload(file: File) {
    const body = new FormData()
    body.append('file', file)
    return this.http.request<{ url: string }>('/upload', { method: 'POST', body })
  }
}
