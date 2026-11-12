import type { Account } from './Account'
import type { MicrosoftIdentity } from './MicrosoftIdentity'

export interface UserRepository {
  upsert(identity: MicrosoftIdentity, ip: string | null): Promise<Account>
}
