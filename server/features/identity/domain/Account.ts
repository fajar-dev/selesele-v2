import type { IdentityProfile } from '../../../../shared/kernel/identity'

export interface Account extends IdentityProfile {
  isActive: boolean | null
}
