import type { NotificationItem } from '../../../../shared/kernel/notification'
import type { EmailActivity } from './EmailActivity'

export interface EmailDelivery {
  id: string
  recipient: string
  recipientUserId: string | null
  workspaceId: string
  itemId: string | null
  memberId: string | null
  kind: NotificationItem['kind']
  title: string
  activity: EmailActivity | null
  attempts: number
  leaseToken: string
  digest?: EmailDelivery[]
}
export interface EmailMessage {
  id: string
  to: string
  subject: string
  text: string
  html: string
}
