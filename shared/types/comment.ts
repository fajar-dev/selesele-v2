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
export interface CommentAuthor {
  id: string
  name: string | null
  email: string
  avatar: string | null
}
export interface CommentMessageItem {
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
