import type { ErrorReporter } from '../../../core/ports/ErrorReporter'
import type { EmailProcessor } from '../domain/EmailProcessor'
import { deliveryPolicy } from '../domain/deliveryPolicy'

/** The application lifecycle owns this timer; requests only persist outbox records. */
export class EmailWorker {
  private running = false
  private timer?: ReturnType<typeof setTimeout>
  private active?: Promise<void>

  constructor(private readonly processor: EmailProcessor, private readonly errors: ErrorReporter) {}

  start(): void {
    if (this.running) {
      return
    }
    this.running = true
    this.schedule(0)
  }

  private schedule(delay: number): void {
    this.timer = setTimeout(() => {
      this.active = this.drain().catch(cause => this.errors.report('Email worker could not process the outbox', cause)).finally(() => {
        this.active = undefined
        if (this.running) {
          this.schedule(deliveryPolicy.pollMs)
        }
      })
    }, delay)
    this.timer.unref()
  }

  private async drain(): Promise<void> {
    for (let processed = 0; this.running && processed < deliveryPolicy.batchSize; processed++) {
      if (!await this.processor.deliverNext()) {
        break
      }
    }
  }

  async close(): Promise<void> {
    this.running = false
    clearTimeout(this.timer)
    await this.active
  }
}
