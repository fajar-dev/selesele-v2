type QueryStatus = 'idle' | 'pending' | 'success' | 'error'
/** Background synchronization must not replace an existing editor with its initial loading view. */
export class QueryPresentation {
  private hasSnapshot = false
  observe(status: QueryStatus) {
    if (status === 'success') {
      this.hasSnapshot = true
    }
    if (status === 'idle') {
      this.hasSnapshot = false
    }
  }

  status(status: QueryStatus): QueryStatus {
    return status === 'pending' && this.hasSnapshot ? 'success' : status
  }
}
