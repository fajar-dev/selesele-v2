import type { User } from '../../../../shared/model/user'

export interface Account extends User {
  isActive: boolean | null
}
