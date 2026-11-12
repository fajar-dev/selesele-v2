export interface OAuthTransaction {
  state: string
  nonce: string
  verifier: string
  createdAt: number
}
