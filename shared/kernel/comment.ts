export interface RelativeTextPosition {
  type?: { client: number, clock: number }
  tname?: string
  item?: { client: number, clock: number }
  assoc?: number
}
interface TextCommentAnchor {
  from: RelativeTextPosition
  to: RelativeTextPosition
}
export type { IdentityProfile as CommentAuthor } from './identity'

interface ObjectCommentAnchor {
  kind: 'object'
  objectType: 'task' | 'element' | 'node' | 'edge'
  objectId: string
}
export type CommentAnchor = TextCommentAnchor | ObjectCommentAnchor
