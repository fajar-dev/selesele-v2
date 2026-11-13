import type { PageAccess } from '../domain/PageAccess'
import type { DocumentRepository } from '../domain/DocumentRepository'
import type { DocumentEditor } from '../domain/DocumentEditor'

export class PageDocumentService {
  constructor(private readonly pages: PageAccess, private readonly documents: DocumentRepository,
    private readonly editor: DocumentEditor) {}

  async content(id: string, userId: string): Promise<string> {
    await this.pages.get(id, userId)
    return this.documents.readContent(id)
  }

  async state(id: string, userId: string) {
    await this.pages.get(id, userId)
    return this.documents.readState(id)
  }

  async replace(id: string, content: string, userId: string): Promise<void> {
    await this.pages.writable(id, userId)
    await this.editor.replaceMarkdown(id, content, userId)
  }
}
