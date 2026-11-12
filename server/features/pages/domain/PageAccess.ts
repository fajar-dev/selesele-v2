import type { Page } from './Page'

export interface PageAccess {
  get(pageId: string, userId: string): Promise<Page>
}
