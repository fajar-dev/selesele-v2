import type { MicrosoftIdentity } from './MicrosoftIdentity'
import type { OAuthTransaction } from './OAuthTransaction'

export interface IdentityProvider {
  authorizationUrl(transaction: OAuthTransaction): Promise<string>
  verify(callback: URL, transaction: OAuthTransaction): Promise<MicrosoftIdentity>
}
