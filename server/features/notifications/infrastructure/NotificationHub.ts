interface NotificationListener { changed: () => void, close: () => void }
export class NotificationHub {
  private readonly listeners = new Map<string, Set<NotificationListener>>()
  subscribe(userId: string, changed: () => void, close: () => void) {
    const listeners = this.listeners.get(userId) || new Set<NotificationListener>()
    const listener = { changed, close }
    listeners.add(listener)
    this.listeners.set(userId, listeners)
    return () => {
      listeners.delete(listener)
      if (!listeners.size) {
        this.listeners.delete(userId)
      }
    }
  }

  changed(userId: string) {
    for (const listener of this.listeners.get(userId) || []) {
      listener.changed()
    }
  }

  close() {
    for (const listeners of this.listeners.values()) {
      for (const listener of [...listeners]) {
        listener.close()
      }
    }
    this.listeners.clear()
  }
}
