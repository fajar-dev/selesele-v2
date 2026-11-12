import type { ErrorReporter } from '../../../core/ports/ErrorReporter'
import type { ActivityPublisher } from '../domain/ActivityPublisher'
import type { NotificationRepository } from '../domain/NotificationRepository'

export class NotificationService implements ActivityPublisher {
  constructor(private readonly repository: NotificationRepository, private readonly changed: (userId: string) => void, private readonly errors: ErrorReporter) {}
  list(userId: string) {
    return this.repository.list(userId)
  }

  async read(userId: string, id?: string) {
    await this.repository.read(userId, id)
    this.changed(userId)
  }

  private async publish(work: () => Promise<string[]>) {
    try {
      const recipients = await work()
      for (const userId of recipients) {
        this.changed(userId)
      }
    } catch (cause) {
      this.errors.report('Unable to deliver activity notification', cause)
    }
  }

  invitation(workspaceId: string, email: string, actorId: string) {
    return this.publish(() => this.repository.invitation(workspaceId, email, actorId))
  }

  comment(pageId: string, threadId: string, body: string, actorId: string) {
    return this.publish(() => this.repository.comment(pageId, threadId, body, actorId))
  }

  mentions(pageId: string, userIds: string[], actorId?: string) {
    return this.publish(() => this.repository.mentions(pageId, userIds, actorId))
  }
}
