import type { IdentityProfile } from '../../../../shared/kernel/identity'

export interface SessionAuthenticator {
  authenticate(token?: string): Promise<IdentityProfile>
}
