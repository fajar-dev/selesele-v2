import type { ApiResponse } from './api'

export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
}

export type AuthResponse = ApiResponse<{ user: User }>
