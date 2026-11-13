import type { PageDraft, PageChanges, Page } from './Page'

export interface PageRepository {
  list(workspaceId: string): Promise<Page[]>
  find(id: string): Promise<Page | null>
  create(workspaceId: string, input: PageDraft, userId: string, content?: string): Promise<Page>
  update(id: string, input: PageChanges): Promise<void>
  delete(id: string): Promise<void>
  archive(id: string, archived: boolean): Promise<void>
}
