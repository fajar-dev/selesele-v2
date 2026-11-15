export interface DocumentRepository {
  readAwareness(id: string): Promise<Uint8Array[]>
  saveAwareness(id: string, updates: { clientId: number, userId: string, state: Uint8Array }[]): Promise<void>
  readContent(id: string): Promise<string>
  readState(id: string): Promise<Uint8Array | null>
  saveState(id: string, state: Uint8Array, markdown: string, userId?: string, checkpoint?: boolean): Promise<void>
}
