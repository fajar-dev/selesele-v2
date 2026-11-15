import type { User } from '../../../../shared/model/user'

export interface SessionAuthenticator {
  authenticate(token?: string): Promise<User>
}
