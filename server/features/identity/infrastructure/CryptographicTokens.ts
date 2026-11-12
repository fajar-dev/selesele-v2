import { createHash, randomBytes } from 'node:crypto'
import type { TokenGenerator } from '../domain/TokenGenerator'

export class CryptographicTokens implements TokenGenerator {
  generate(): string {
    return randomBytes(32).toString('base64url')
  }

  digest(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
