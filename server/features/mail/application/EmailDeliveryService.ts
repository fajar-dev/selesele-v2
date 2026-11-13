import { digestEmail } from '../domain/digestEmail'
import type { EmailDelivery } from '../domain/EmailDelivery'
import type { EmailProcessor } from '../domain/EmailProcessor'
import type { Clock } from '../../../core/ports/Clock'
import type { EmailOutbox } from '../domain/EmailOutbox'
import type { EmailSender } from '../domain/EmailSender'
import { notificationEmail } from '../domain/notificationEmail'
import { nextDeliveryAttempt } from '../domain/deliveryPolicy'

export class EmailDeliveryService implements EmailProcessor {
  constructor(private readonly outbox: EmailOutbox, private readonly sender: EmailSender, private readonly clock: Clock, private readonly origin: string) {}

  async deliverNext(): Promise<boolean> {
    const delivery = await this.outbox.claim(this.clock.now())
    if (!delivery) {
      return false
    }
    const pending: EmailDelivery[] = []
    for (const item of delivery.digest ?? [delivery]) {
      if (await this.outbox.deliverable(item, this.clock.now())) {
        pending.push(item)
      } else {
        await this.outbox.complete(item, 'skipped', this.clock.now())
      }
    }
    if (!pending.length) {
      return true
    }
    try {
      await this.sender.send(delivery.digest ? digestEmail(pending, this.origin) : notificationEmail(pending[0]!, this.origin))
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string' ? cause.code.slice(0, 80) : 'delivery_failed'
      for (const item of pending) {
        await this.outbox.retry(item, nextDeliveryAttempt(item.attempts, this.clock.now()), code)
      }
      return true
    }
    for (const item of pending) {
      await this.outbox.complete(item, 'sent', this.clock.now())
    }
    return true
  }
}
