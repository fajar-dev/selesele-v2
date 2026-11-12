import type { NotificationItem } from '../../../../shared/kernel/notification'

export interface NotificationRepository {
  invitation(workspaceId: string, email: string, actorId: string): Promise<string[]>
  comment(pageId: string, threadId: string, body: string, actorId: string, event?: 'comment' | 'reply'): Promise<string[]>
  mentions(pageId: string, userIds: string[], actorId?: string): Promise<string[]>
  list(userId: string): Promise<NotificationItem[]>
  read(userId: string, id?: string): Promise<void>
}
