import type { AuthProvider } from '#shared/model/authentication'
import type { ApiResponse } from '#shared/model/api'
import type { User } from '#shared/model/user'
import type { ApiTransport } from '~/core/http/ApiTransport'

export class AuthClient {
  constructor(private readonly http: ApiTransport) {}

  async providers() {
    return this.http.request<ApiResponse<AuthProvider[]>>('/auth/providers')
  }

  async me() {
    return this.http.request<ApiResponse<User>>('/auth/me')
  }

  async logout() {
    await this.http.request('/auth/logout', { method: 'POST' })
  }
}
