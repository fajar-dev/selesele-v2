import type { CommentThreadItem } from '#shared/contracts/comment'

/** Coalesces socket invalidations and discards snapshots superseded while loading. */
export class CommentSynchronization {
  private revision = 0
  private running = false
  private disposed = false
  private failures = 0
  private retry: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly load: () => Promise<CommentThreadItem[]>,
    private readonly apply: (threads: CommentThreadItem[]) => void,
    private readonly onError: (cause: unknown) => void,
    private readonly shouldRetry: (cause: unknown) => boolean,
    private readonly retryDelay = 500
  ) {}

  invalidate(): void {
    if (this.disposed) {
      return
    }
    this.revision++
    this.failures = 0
    clearTimeout(this.retry)
    this.retry = undefined
    void this.run()
  }

  dispose(): void {
    this.disposed = true
    clearTimeout(this.retry)
  }

  private async run(): Promise<void> {
    if (this.running || this.disposed) {
      return
    }
    this.running = true
    try {
      while (!this.disposed) {
        const revision = this.revision
        try {
          const threads = await this.load()
          if (this.disposed) {
            return
          }
          if (revision !== this.revision) {
            continue
          }
          this.failures = 0
          this.apply(threads)
        } catch (cause) {
          if (this.disposed) {
            return
          }
          if (revision !== this.revision) {
            continue
          }
          this.onError(cause)
          if (this.shouldRetry(cause)) {
            const delay = Math.min(this.retryDelay * 2 ** this.failures++, 30000)
            this.retry = setTimeout(() => {
              this.retry = undefined
              void this.run()
            }, delay)
          }
        }
        if (revision === this.revision) {
          return
        }
      }
    } finally {
      this.running = false
    }
  }
}
