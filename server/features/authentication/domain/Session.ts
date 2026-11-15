import type { Account } from './Account'

export interface Session {
  user: Account
  expiresAt: Date
}
