import type { User } from '../../../../shared/model/user'
import type { CommentAnchor } from '../../../../shared/model/comment'

interface CommentMessage {
  id: string
  body: string
  author: User
  createdAt: Date
}
export interface CommentThread {
  id: string
  itemId: string
  quote: string
  anchor: CommentAnchor
  createdBy: string
  createdAt: Date
  resolvedAt: Date | null
  resolvedBy: string | null
  messages: CommentMessage[]
}
export interface CommentDraft {
  quote: string
  anchor: CommentAnchor
  body: string
}
