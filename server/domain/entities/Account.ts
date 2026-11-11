import type { User } from '../../../shared/types/auth'

export interface Account extends User {
  isActive: boolean | null
}
