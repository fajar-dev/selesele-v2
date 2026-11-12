import type { ApiResponse } from '#shared/contracts/api'
import type { User } from '#shared/contracts/auth'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class AuthClient {
  constructor(private readonly http: ApiTransport) {}

  async me() {
    return this.http.request<ApiResponse<User>>('/auth/me')
  }

  async logout() {
    await this.http.request('/auth/logout', { method: 'POST' })
  }
}
