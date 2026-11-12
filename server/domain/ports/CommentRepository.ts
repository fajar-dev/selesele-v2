import type { CommentThread } from '../entities/CommentThread'
import type { CommentThreadInput } from '../../../shared/types/comment'

export interface CommentRepository {
  list(pageId: string): Promise<CommentThread[]>
  find(pageId: string, threadId: string): Promise<CommentThread | null>
  create(pageId: string, input: CommentThreadInput, userId: string): Promise<string>
  reply(threadId: string, body: string, userId: string): Promise<void>
  resolve(threadId: string, resolved: boolean, userId: string): Promise<void>
  delete(threadId: string): Promise<void>
}
