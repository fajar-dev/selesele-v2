export interface NotificationItem {
  id: string
  kind: 'invitation' | 'comment' | 'reply' | 'mention'
  title: string
  workspaceId: string
  pageId: string | null
  threadId?: string | null
  readAt: string | null
  createdAt: string
}
