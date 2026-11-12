/** Orders writes for one resource without allowing a failed write to block retries. */
export class SerialTaskQueue {
  private tail: Promise<unknown> = Promise.resolve()

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.catch(() => {}).then(task)
    this.tail = result
    return result
  }
}
