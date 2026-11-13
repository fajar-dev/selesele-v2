export interface ActivityPublisher {
  comment(itemId: string, threadId: string, body: string, actorId: string, event?: 'comment' | 'reply'): Promise<void>
  mentions(itemId: string, userIds: string[], actorId?: string): Promise<void>
}
