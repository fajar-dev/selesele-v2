export interface DocumentEditor {
  replaceMarkdown(pageId: string, content: string, userId?: string): Promise<void>
}
