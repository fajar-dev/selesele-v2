import type { PageInput, PageUpdate } from '../../../shared/types/page'
import type { Page } from '../entities/Page'

export interface PageRepository {
  list(workspaceId: string): Promise<Page[]>
  find(id: string): Promise<Page | null>
  create(workspaceId: string, input: PageInput, userId: string): Promise<Page>
  update(id: string, input: PageUpdate): Promise<void>
  move(id: string, folderId: string | null): Promise<void>
  delete(id: string): Promise<void>
}
