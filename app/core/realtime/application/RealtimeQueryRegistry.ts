import { matchesRealtimeScope } from '#shared/model/realtime'
import type { RealtimeChange, RealtimeScope } from '#shared/model/realtime'

interface Registration {
  scope: RealtimeScope
  refresh: () => Promise<unknown>
  active: boolean
  pending: boolean
  running: boolean
}
/** Coalesces bursts and always performs a trailing refresh when changes arrive during a fetch. */
export class RealtimeQueryRegistry {
  private readonly registrations = new Map<string, Set<Registration>>()
  private timer?: ReturnType<typeof setTimeout>
  private disposed = false
  register(key: string, scope: RealtimeScope, refresh: () => Promise<unknown>) {
    const registration: Registration = { scope, refresh, active: true, pending: false, running: false }
    const entries = this.registrations.get(key) || new Set<Registration>()
    entries.add(registration)
    this.registrations.set(key, entries)
    return () => {
      registration.active = false
      entries.delete(registration)
      if (!entries.size) {
        this.registrations.delete(key)
      }
    }
  }

  invalidate(changes?: RealtimeChange[]) {
    if (this.disposed) {
      return
    }
    for (const entries of this.registrations.values()) {
      // Shared Nuxt queries are refreshed once, even when several components observe them.
      const matched = [...entries].filter(entry => !changes || changes.some(change => matchesRealtimeScope(entry.scope, change)))
      const entry = matched.find(value => value.running) || matched[0]
      if (entry) {
        entry.pending = true
      }
    }
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = undefined
        void this.flush()
      }, 60)
    }
  }

  private async flush() {
    await Promise.allSettled([...this.registrations.values()].flatMap(entries => [...entries].filter(entry => entry.pending && !entry.running).map(async (entry) => {
      entry.running = true
      try {
        do {
          entry.pending = false
          await entry.refresh()
        } while (entry.active && entry.pending && !this.disposed)
      } finally {
        entry.running = false
      }
    })))
  }

  dispose() {
    this.disposed = true
    clearTimeout(this.timer)
    for (const entries of this.registrations.values()) {
      for (const entry of entries) {
        entry.active = false
      }
    }
    this.registrations.clear()
  }
}
