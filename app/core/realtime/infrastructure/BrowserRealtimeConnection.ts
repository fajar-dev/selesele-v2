import type { RealtimeFrame } from '#shared/model/realtime'
import { realtimeTopics } from '#shared/model/realtime'
import type { RealtimeQueryRegistry } from '../application/RealtimeQueryRegistry'

/** Owns the application's only invalidation connection; document CRDT data uses its own WebSocket. */
export class BrowserRealtimeConnection {
  private source?: EventSource
  private generation = 0
  constructor(private readonly registry: RealtimeQueryRegistry, private readonly state: (connected: boolean) => void, private readonly revalidateSession: () => void) {}
  start() {
    if (this.source) {
      return
    }
    const generation = ++this.generation
    const source = new EventSource('/api/realtime/events')
    this.source = source
    source.onopen = () => this.state(true)
    source.onerror = () => this.state(false)
    source.onmessage = (message) => {
      if (generation !== this.generation) {
        return
      }
      try {
        const frame = JSON.parse(message.data) as RealtimeFrame
        if (frame.type === 'ready') {
          this.registry.invalidate()
        } else if (frame.type === 'session-expired') {
          this.revalidateSession()
        } else if (frame.type === 'changes' && Array.isArray(frame.changes)) {
          const changes = frame.changes.filter(change => (change.workspaceId === null || typeof change.workspaceId === 'string') && Array.isArray(change.topics) && change.topics.every(topic => realtimeTopics.includes(topic)))
          if (changes.some(change => change.topics.includes('session'))) {
            this.revalidateSession()
          }
          this.registry.invalidate(changes)
        }
      } catch { /* Discard malformed transport frames; the next connection rehydrates snapshots. */ }
    }
  }

  stop() {
    this.generation++
    this.source?.close()
    this.source = undefined
    this.state(false)
  }

  resume() {
    this.start()
    this.registry.invalidate()
  }
}
