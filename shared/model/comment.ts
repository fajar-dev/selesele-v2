import type { User } from './user'

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

interface ObjectCommentAnchor {
  kind: 'object'
  objectType: 'task' | 'element' | 'node' | 'edge'
  objectId: string
}
export type CommentAnchor = TextCommentAnchor | ObjectCommentAnchor

interface CommentMessageItem {
  id: string
  body: string
  author: User
  createdAt: string
}
export interface CommentThreadItem {
  id: string
  itemId: string
  quote: string
  anchor: CommentAnchor
  createdBy: string
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
  messages: CommentMessageItem[]
}
export interface CommentThreadInput {
  quote: string
  anchor: CommentAnchor
  body: string
}
