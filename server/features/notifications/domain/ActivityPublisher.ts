export interface ActivityPublisher {
  invitation(workspaceId: string, email: string, actorId: string): Promise<void>
  comment(pageId: string, threadId: string, body: string, actorId: string): Promise<void>
  mentions(pageId: string, userIds: string[], actorId?: string): Promise<void>
}
