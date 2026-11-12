import type { CommentThread, CommentDraft } from './CommentThread'

export interface CommentRepository {
  list(pageId: string): Promise<CommentThread[]>
  find(pageId: string, threadId: string): Promise<CommentThread | null>
  create(pageId: string, input: CommentDraft, userId: string): Promise<string>
  reply(threadId: string, body: string, userId: string): Promise<void>
  resolve(threadId: string, resolved: boolean, userId: string): Promise<void>
  delete(threadId: string): Promise<void>
}
