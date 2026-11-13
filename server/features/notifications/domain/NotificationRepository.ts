import type { NotificationItem } from '../../../../shared/kernel/notification'

export interface NotificationRepository {
  comment(itemId: string, threadId: string, body: string, actorId: string, event?: 'comment' | 'reply'): Promise<string[]>
  mentions(itemId: string, userIds: string[], actorId?: string): Promise<string[]>
  list(userId: string): Promise<NotificationItem[]>
  read(userId: string, id?: string): Promise<void>
}
