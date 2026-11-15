import type { Account } from './Account'
import type { ExternalIdentity } from './ExternalIdentity'

export interface UserRepository {
  upsert(identity: ExternalIdentity, ip: string | null): Promise<Account>
}
