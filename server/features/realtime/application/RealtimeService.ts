import type { RealtimeFrame, RealtimeChange } from '../../../../shared/model/realtime'
import type { RealtimeRepository, RealtimeEffects } from '../domain/RealtimeRepository'
import type { ErrorReporter } from '../../../core/ports/ErrorReporter'

interface Subscription {
  userId: string
  send: (frame: RealtimeFrame) => void
  close: () => void
}
/** One ordered database feed per process, shared by all authenticated browser connections. */
export class RealtimeService {
  private readonly subscriptions = new Set<Subscription>()
  private timer?: ReturnType<typeof setInterval>
  private active?: Promise<void>
  private cursor = 0
  private initialized = false
  private prunedAt = 0
  private closed = false
  constructor(private readonly repository: RealtimeRepository, private readonly effects: RealtimeEffects, private readonly errors: ErrorReporter) { }
  start() {
    if (this.timer) {
      return
    }
    this.tick()
    this.timer = setInterval(() => this.tick(), 200)
    this.timer.unref()
  }

  private tick() {
    if (this.active || this.closed) {
      return
    }
    this.active = this.synchronize().catch(cause => this.errors.report('Realtime synchronization failed', cause)).finally(() => {
      this.active = undefined
    })
  }

  async synchronize() {
    if (!this.initialized) {
      this.cursor = await this.repository.latestSequence()
      this.initialized = true
    }
    await this.repository.publish()
    const events = await this.repository.changes(this.cursor)
    if (events.length) {
      await this.effects.apply(events)
      const userIds = [...new Set([...this.subscriptions].map(subscription => subscription.userId))]
      const memberships = await this.repository.memberships(userIds)
      for (const subscription of [...this.subscriptions]) {
        const accessible = new Set(memberships.filter(member => member.userId === subscription.userId).map(member => member.workspaceId))
        const grouped = new Map<string, RealtimeChange>()
        for (const event of events) {
          if (event.userId ? event.userId !== subscription.userId : !event.workspaceId || !accessible.has(event.workspaceId)) {
            continue
          }
          const scope = event.workspaceId || ''
          const change = grouped.get(scope) || { workspaceId: event.workspaceId, topics: [] }
          if (!change.topics.includes(event.topic)) {
            change.topics.push(event.topic)
          }
          grouped.set(scope, change)
        }
        if (grouped.size) {
          try {
            subscription.send({ type: 'changes', changes: [...grouped.values()] })
          } catch {
            subscription.close()
          }
        }
      }
      this.cursor = events.at(-1)!.sequence
    }
    if (Date.now() - this.prunedAt > 60000) {
      await this.repository.prune()
      this.prunedAt = Date.now()
    }
  }

  stream(userId: string, authenticate: () => Promise<unknown>) {
    if (this.closed) {
      throw new Error('Realtime service is stopping')
    }
    if ([...this.subscriptions].filter(subscription => subscription.userId === userId).length >= 16) {
      throw new Error('Too many realtime sessions')
    }
    let dispose = () => { }
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const encoder = new TextEncoder()
        let ended = false, checking = false
        const send = (frame: RealtimeFrame) => {
          if (!ended) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`))
          }
        }
        const close = () => {
          if (ended) {
            return
          }
          dispose()
          controller.close()
        }
        const subscription = { userId, send, close }
        this.subscriptions.add(subscription)
        const heartbeat = setInterval(async () => {
          if (checking || ended) {
            return
          }
          checking = true
          try {
            await authenticate()
            if (!ended) {
              controller.enqueue(encoder.encode(': keepalive\n\n'))
            }
          } catch {
            send({ type: 'session-expired' })
            close()
          } finally {
            checking = false
          }
        }, 5000)
        heartbeat.unref()
        dispose = () => {
          ended = true
          clearInterval(heartbeat)
          this.subscriptions.delete(subscription)
        }
        send({ type: 'ready' })
      },
      cancel: () => dispose()
    })
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
  }

  async close() {
    this.closed = true
    clearInterval(this.timer)
    for (const subscription of [...this.subscriptions]) {
      subscription.close()
    }
    await this.active
  }
}
