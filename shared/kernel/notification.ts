export interface NotificationItem {
  id: string
  kind: 'invitation' | 'reply' | 'mention'
  title: string
  workspaceId: string
  pageId: string | null
  readAt: string | null
  createdAt: string
}
