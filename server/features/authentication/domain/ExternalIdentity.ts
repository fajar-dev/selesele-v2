import type { AuthProvider } from '../../../../shared/model/authentication'

export interface ExternalIdentity {
  provider: AuthProvider
  subject: string
  email: string
  name?: string
}
