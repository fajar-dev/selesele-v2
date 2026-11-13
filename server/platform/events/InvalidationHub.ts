interface InvalidationListener {
  changed: () => void
  close: () => void
}
export class InvalidationHub {
  private readonly listeners = new Map<string, Set<InvalidationListener>>()
  subscribe(key: string, changed: () => void, close: () => void) {
    const listeners = this.listeners.get(key) || new Set<InvalidationListener>()
    const listener = { changed, close }
    listeners.add(listener)
    this.listeners.set(key, listeners)
    return () => {
      listeners.delete(listener)
      if (!listeners.size) {
        this.listeners.delete(key)
      }
    }
  }

  changed(key: string) {
    for (const listener of this.listeners.get(key) || []) {
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
