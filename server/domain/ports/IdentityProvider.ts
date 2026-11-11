import type { MicrosoftIdentity } from '../entities/MicrosoftIdentity'
import type { OAuthTransaction } from '../entities/OAuthTransaction'

export interface IdentityProvider {
  authorizationUrl(transaction: OAuthTransaction): Promise<string>
  verify(callback: URL, transaction: OAuthTransaction): Promise<MicrosoftIdentity>
}
