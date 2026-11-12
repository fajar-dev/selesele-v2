import type { Session } from './Session'

export interface SessionRepository {
  create(hash: string, userId: string, expiresAt: Date): Promise<void>
  find(hash: string): Promise<Session | null>
  delete(hash: string): Promise<void>
  rotate(oldHash: string, newHash: string, expiresAt: Date): Promise<boolean>
}
