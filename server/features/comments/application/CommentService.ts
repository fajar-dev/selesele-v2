import type { ActivityPublisher } from '../../notifications/domain/ActivityPublisher'
import type { CommentEvents } from '../domain/CommentEvents'
import type { CommentRepository } from '../domain/CommentRepository'
import type { ItemAccess } from '../../items/domain/ItemAccess'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { CommentThread } from '../domain/CommentThread'
import type { CommentThreadInput, CommentThreadItem } from '../../../../shared/contracts/comment'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class CommentService {
  constructor(private readonly comments: CommentRepository, private readonly items: ItemAccess, private readonly access: WorkspaceAuthorization, private readonly events: CommentEvents, private readonly activity: ActivityPublisher) {
  }

  async list(itemId: string, userId: string): Promise<CommentThreadItem[]> {
    await this.items.get(itemId, userId)
    return (await this.comments.list(itemId)).map(thread => this.present(thread))
  }

  async create(itemId: string, input: CommentThreadInput, userId: string): Promise<CommentThreadItem> {
    await this.items.commentable(itemId, userId)
    const id = await this.comments.create(itemId, input, userId)
    const thread = this.present(await this.requireThread(itemId, id))
    await this.events.commentsChanged(itemId)
    await this.activity.comment(itemId, id, input.body, userId, 'comment')
    return thread
  }

  async reply(itemId: string, threadId: string, body: string, userId: string): Promise<CommentThreadItem> {
    await this.items.commentable(itemId, userId)
    const thread = await this.requireThread(itemId, threadId)
    if (thread.resolvedAt) {
      throw new ApplicationError('conflict', 'Reopen this discussion before replying')
    }
    await this.comments.reply(threadId, body, userId)
    const updated = this.present(await this.requireThread(itemId, threadId))
    await this.events.commentsChanged(itemId)
    await this.activity.comment(itemId, threadId, body, userId, 'reply')
    return updated
  }

  async resolve(itemId: string, threadId: string, resolved: boolean, userId: string): Promise<CommentThreadItem> {
    await this.items.commentable(itemId, userId)
    await this.requireThread(itemId, threadId)
    await this.comments.resolve(threadId, resolved, userId)
    const updated = this.present(await this.requireThread(itemId, threadId))
    await this.events.commentsChanged(itemId)
    return updated
  }

  async delete(itemId: string, threadId: string, userId: string): Promise<void> {
    const item = await this.items.commentable(itemId, userId)
    await this.access.requireCapability(item.workspaceId, userId, 'deleteContent')
    const thread = await this.requireThread(itemId, threadId)
    if (thread.createdBy !== userId) {
      await this.access.requireManager(item.workspaceId, userId)
    }
    await this.comments.delete(threadId)
    await this.events.commentsChanged(itemId)
  }

  private async requireThread(itemId: string, threadId: string): Promise<CommentThread> {
    const thread = await this.comments.find(itemId, threadId)
    if (!thread) {
      throw new ApplicationError('not_found', 'Comment discussion not found')
    }
    return thread
  }

  private present(thread: CommentThread): CommentThreadItem {
    return { ...thread, createdAt: thread.createdAt.toISOString(), resolvedAt: thread.resolvedAt?.toISOString() || null,
      messages: thread.messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString() })) }
  }
}
