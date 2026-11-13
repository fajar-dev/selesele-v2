export interface NotificationItem {
  id: string
  kind: 'invitation' | 'comment' | 'reply' | 'mention'
  title: string
  workspaceId: string
  itemId: string | null
  threadId?: string | null
  readAt: string | null
  createdAt: string
}
