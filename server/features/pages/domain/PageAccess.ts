import type { Page } from './Page'

export interface PageAccess {
  commentable(pageId: string, userId: string): Promise<Page>
  writable(pageId: string, userId: string): Promise<Page>
  get(pageId: string, userId: string): Promise<Page>
}
