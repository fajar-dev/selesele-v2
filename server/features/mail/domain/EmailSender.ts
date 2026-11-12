import type { EmailMessage } from './EmailDelivery'

export interface EmailSender {
  send(message: EmailMessage): Promise<void>
}
