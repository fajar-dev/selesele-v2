export interface RelativeTextPosition {
  type?: { client: number, clock: number }
  tname?: string
  item?: { client: number, clock: number }
  assoc?: number
}
export interface CommentAnchor {
  from: RelativeTextPosition
  to: RelativeTextPosition
}
export type { IdentityProfile as CommentAuthor } from './identity'
