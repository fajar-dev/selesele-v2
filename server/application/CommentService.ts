import type { CommentEvents } from '../domain/ports/CommentEvents'
import type { CommentRepository } from '../domain/ports/CommentRepository'
import type { PageService } from './PageService'
import type { WorkspaceService } from './WorkspaceService'
import type { CommentThread } from '../domain/entities/CommentThread'
import type { CommentThreadInput, CommentThreadItem } from '../../shared/types/comment'
import { ApplicationError } from '../domain/errors/ApplicationError'

export class CommentService {
  constructor(private readonly comments: CommentRepository, private readonly pages: PageService, private readonly workspaces: WorkspaceService, private readonly events: CommentEvents) {}

  async list(pageId: string, userId: string): Promise<CommentThreadItem[]> {
    await this.pages.get(pageId, userId)
    return (await this.comments.list(pageId)).map(thread => this.present(thread))
  }

  async create(pageId: string, input: CommentThreadInput, userId: string): Promise<CommentThreadItem> {
    await this.pages.get(pageId, userId)
    const id = await this.comments.create(pageId, input, userId)
    const thread = this.present(await this.requireThread(pageId, id))
    await this.events.commentsChanged(pageId)
    return thread
  }

  async reply(pageId: string, threadId: string, body: string, userId: string): Promise<CommentThreadItem> {
    await this.pages.get(pageId, userId)
    const thread = await this.requireThread(pageId, threadId)
    if (thread.resolvedAt) {
      throw new ApplicationError(409, 'Reopen this discussion before replying')
    }
    await this.comments.reply(threadId, body, userId)
    const updated = this.present(await this.requireThread(pageId, threadId))
    await this.events.commentsChanged(pageId)
    return updated
  }

  async resolve(pageId: string, threadId: string, resolved: boolean, userId: string): Promise<CommentThreadItem> {
    await this.pages.get(pageId, userId)
    await this.requireThread(pageId, threadId)
    await this.comments.resolve(threadId, resolved, userId)
    const updated = this.present(await this.requireThread(pageId, threadId))
    await this.events.commentsChanged(pageId)
    return updated
  }

  async delete(pageId: string, threadId: string, userId: string): Promise<void> {
    const page = await this.pages.get(pageId, userId)
    const thread = await this.requireThread(pageId, threadId)
    if (thread.createdBy !== userId) {
      await this.workspaces.requireManager(page.workspaceId, userId)
    }
    await this.comments.delete(threadId)
    await this.events.commentsChanged(pageId)
  }

  private async requireThread(pageId: string, threadId: string): Promise<CommentThread> {
    const thread = await this.comments.find(pageId, threadId)
    if (!thread) {
      throw new ApplicationError(404, 'Comment discussion not found')
    }
    return thread
  }

  private present(thread: CommentThread): CommentThreadItem {
    return { ...thread, createdAt: thread.createdAt.toISOString(), resolvedAt: thread.resolvedAt?.toISOString() || null,
      messages: thread.messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString() })) }
  }
}
