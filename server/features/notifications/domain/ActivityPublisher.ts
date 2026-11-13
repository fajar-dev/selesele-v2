export interface ActivityPublisher {
  comment(pageId: string, threadId: string, body: string, actorId: string, event?: 'comment' | 'reply'): Promise<void>
  mentions(pageId: string, userIds: string[], actorId?: string): Promise<void>
}
