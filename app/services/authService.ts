import type { ApiResponse } from '#shared/types/api'
import type { User } from '#shared/types/auth'
import { apiService } from './apiService'

export class AuthService {
  async me() {
    return apiService.request<ApiResponse<User>>('/auth/me')
  }

  async logout() {
    await apiService.request('/auth/logout', { method: 'POST' })
  }

  async refresh() {
    return apiService.request<ApiResponse<{ user: User }>>('/auth/refresh', { method: 'POST' })
  }
}

export const authService = new AuthService()
