import type { EmailDelivery } from './EmailDelivery'

export interface EmailOutbox {
  claim(now: Date): Promise<EmailDelivery | null>
  deliverable(delivery: EmailDelivery, now: Date): Promise<boolean>
  complete(delivery: EmailDelivery, state: 'sent' | 'skipped', now: Date): Promise<void>
  retry(delivery: EmailDelivery, availableAt: Date | null, errorCode: string): Promise<void>
}
