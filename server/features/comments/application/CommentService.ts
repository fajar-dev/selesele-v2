import type { ActivityPublisher } from '../../notifications/domain/ActivityPublisher'
import type { CommentEvents } from '../domain/CommentEvents'
import type { CommentRepository } from '../domain/CommentRepository'
import type { PageAccess } from '../../pages/domain/PageAccess'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { CommentThread } from '../domain/CommentThread'
import type { CommentThreadInput, CommentThreadItem } from '../../../../shared/contracts/comment'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class CommentService {
  constructor(private readonly comments: CommentRepository, private readonly pages: PageAccess, private readonly access: WorkspaceAuthorization, private readonly events: CommentEvents, private readonly activity: ActivityPublisher) {}

  async list(pageId: string, userId: string): Promise<CommentThreadItem[]> {
    await this.pages.get(pageId, userId)
    return (await this.comments.list(pageId)).map(thread => this.present(thread))
  }

  async create(pageId: string, input: CommentThreadInput, userId: string): Promise<CommentThreadItem> {
    await this.pages.commentable(pageId, userId)
    const id = await this.comments.create(pageId, input, userId)
    const thread = this.present(await this.requireThread(pageId, id))
    await this.events.commentsChanged(pageId)
    await this.activity.comment(pageId, id, input.body, userId, 'comment')
    return thread
  }

  async reply(pageId: string, threadId: string, body: string, userId: string): Promise<CommentThreadItem> {
    await this.pages.commentable(pageId, userId)
    const thread = await this.requireThread(pageId, threadId)
    if (thread.resolvedAt) {
      throw new ApplicationError('conflict', 'Reopen this discussion before replying')
    }
    await this.comments.reply(threadId, body, userId)
    const updated = this.present(await this.requireThread(pageId, threadId))
    await this.events.commentsChanged(pageId)
    await this.activity.comment(pageId, threadId, body, userId, 'reply')
    return updated
  }

  async resolve(pageId: string, threadId: string, resolved: boolean, userId: string): Promise<CommentThreadItem> {
    await this.pages.commentable(pageId, userId)
    await this.requireThread(pageId, threadId)
    await this.comments.resolve(threadId, resolved, userId)
    const updated = this.present(await this.requireThread(pageId, threadId))
    await this.events.commentsChanged(pageId)
    return updated
  }

  async delete(pageId: string, threadId: string, userId: string): Promise<void> {
    const page = await this.pages.commentable(pageId, userId)
    await this.access.requireCapability(page.workspaceId, userId, 'deleteContent')
    const thread = await this.requireThread(pageId, threadId)
    if (thread.createdBy !== userId) {
      await this.access.requireManager(page.workspaceId, userId)
    }
    await this.comments.delete(threadId)
    await this.events.commentsChanged(pageId)
  }

  private async requireThread(pageId: string, threadId: string): Promise<CommentThread> {
    const thread = await this.comments.find(pageId, threadId)
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
