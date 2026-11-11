/** Minimal transport contract used by document collaboration. */
export interface CollaborationPeer {
  readonly id: string
  send(data: Uint8Array): unknown
  close(code?: number, reason?: string): void
}
