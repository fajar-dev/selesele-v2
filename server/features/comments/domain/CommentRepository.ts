import type { CommentThread, CommentDraft } from './CommentThread'

export interface CommentRepository {
  list(itemId: string): Promise<CommentThread[]>
  find(itemId: string, threadId: string): Promise<CommentThread | null>
  create(itemId: string, input: CommentDraft, userId: string): Promise<string>
  reply(threadId: string, body: string, userId: string): Promise<void>
  resolve(threadId: string, resolved: boolean, userId: string): Promise<void>
  delete(threadId: string): Promise<void>
}
