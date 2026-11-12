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
    if (!await this.outbox.deliverable(delivery, this.clock.now())) {
      await this.outbox.complete(delivery, 'skipped', this.clock.now())
      return true
    }
    try {
      await this.sender.send(notificationEmail(delivery, this.origin))
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string' ? cause.code.slice(0, 80) : 'delivery_failed'
      await this.outbox.retry(delivery, nextDeliveryAttempt(delivery.attempts, this.clock.now()), code)
      return true
    }
    await this.outbox.complete(delivery, 'sent', this.clock.now())
    return true
  }
}
