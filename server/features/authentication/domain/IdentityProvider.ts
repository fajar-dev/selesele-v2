import type { ExternalIdentity } from './ExternalIdentity'
import type { OAuthTransaction } from './OAuthTransaction'

export interface IdentityProvider {
  authorizationUrl(transaction: OAuthTransaction): Promise<string>
  verify(callback: URL, transaction: OAuthTransaction): Promise<ExternalIdentity>
}
