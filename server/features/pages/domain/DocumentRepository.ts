export interface DocumentRepository {
  readContent(id: string): Promise<string>
  readState(id: string): Promise<Uint8Array | null>
  saveState(id: string, state: Uint8Array, markdown: string): Promise<void>
}
