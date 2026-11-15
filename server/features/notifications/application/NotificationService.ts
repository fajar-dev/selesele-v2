import type { ErrorReporter } from '../../../core/ports/ErrorReporter'
import type { ActivityPublisher } from '../domain/ActivityPublisher'
import type { NotificationRepository } from '../domain/NotificationRepository'

export class NotificationService implements ActivityPublisher {
  constructor(private readonly repository: NotificationRepository, private readonly errors: ErrorReporter) {
  }

  list(userId: string) {
    return this.repository.list(userId)
  }

  async read(userId: string, id?: string) {
    await this.repository.read(userId, id)
  }

  private async publish(work: () => Promise<string[]>) {
    try {
      await work()
    } catch (cause) {
      this.errors.report('Unable to deliver activity notification', cause)
    }
  }

  comment(itemId: string, threadId: string, body: string, actorId: string, event: 'comment' | 'reply' = 'reply') {
    return this.publish(() => this.repository.comment(itemId, threadId, body, actorId, event))
  }

  mentions(itemId: string, userIds: string[], actorId?: string) {
    return this.publish(() => this.repository.mentions(itemId, userIds, actorId))
  }
}
