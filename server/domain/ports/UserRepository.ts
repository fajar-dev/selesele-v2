import type { Account } from '../entities/Account'
import type { MicrosoftIdentity } from '../entities/MicrosoftIdentity'

export interface UserRepository {
  upsert(identity: MicrosoftIdentity, ip: string | null): Promise<Account>
}
