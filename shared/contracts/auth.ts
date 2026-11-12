import type { ApiResponse } from './api'
import type { IdentityProfile as User } from '../kernel/identity'

export type { IdentityProfile as User } from '../kernel/identity'

export type AuthResponse = ApiResponse<{ user: User }>
