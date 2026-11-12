import type { CommentAnchor, CommentAuthor } from '../../../shared/types/comment'

export interface CommentMessage {
  id: string
  body: string
  author: CommentAuthor
  createdAt: Date
}
export interface CommentThread {
  id: string
  pageId: string
  quote: string
  anchor: CommentAnchor
  createdBy: string
  createdAt: Date
  resolvedAt: Date | null
  resolvedBy: string | null
  messages: CommentMessage[]
}
