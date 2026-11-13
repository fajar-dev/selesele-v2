export interface DocumentEditor {
  replaceMarkdown(itemId: string, content: string, userId?: string): Promise<void>
}
