import type { CommentAnchor, CommentAuthor } from '../kernel/comment'

export type { CommentAnchor } from '../kernel/comment'

interface CommentMessageItem {
  id: string
  body: string
  author: CommentAuthor
  createdAt: string
}
export interface CommentThreadItem {
  id: string
  pageId: string
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
