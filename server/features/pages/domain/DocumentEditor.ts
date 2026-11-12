export interface DocumentEditor {
  replaceMarkdown(pageId: string, content: string): Promise<void>
}
