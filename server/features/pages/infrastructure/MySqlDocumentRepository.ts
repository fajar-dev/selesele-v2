import { eq } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { documents, pages } from '../../../platform/database/schema'
import type { DocumentRepository } from '../domain/DocumentRepository'

export class MySqlDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Database) {}

  async readContent(id: string): Promise<string> {
    const [document] = await this.db.select({ markdown: documents.markdown }).from(documents)
      .where(eq(documents.pageId, id)).limit(1)
    return document?.markdown || ''
  }

  async readState(id: string): Promise<Uint8Array | null> {
    const [document] = await this.db.select({ state: documents.state }).from(documents)
      .where(eq(documents.pageId, id)).limit(1)
    return document?.state ? new Uint8Array(document.state) : null
  }

  async saveState(id: string, state: Uint8Array, markdown: string): Promise<void> {
    const snapshot = Buffer.from(state)
    await this.db.transaction(async (transaction) => {
      await transaction.insert(documents).values({ pageId: id, markdown, state: snapshot })
        .onDuplicateKeyUpdate({ set: { state: snapshot, markdown } })
      await transaction.update(pages).set({ updatedAt: new Date() }).where(eq(pages.id, id))
    })
  }
}
