export interface DocumentRepository {
  readContent(id: string): Promise<string>
  updateContent(id: string, content: string): Promise<void>
  readState(id: string): Promise<Uint8Array | null>
  saveState(id: string, state: Uint8Array, markdown: string): Promise<void>
}
