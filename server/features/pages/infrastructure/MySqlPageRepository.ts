import type { PageDraft, PageChanges, Page } from '../domain/Page'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { PageRepository } from '../domain/PageRepository'
import type { Database } from '../../../platform/database/client'
import { documents, pages, folders } from '../../../platform/database/schema'

export class MySqlPageRepository implements PageRepository {
  constructor(private readonly db: Database) {}

  list(workspaceId: string): Promise<Page[]> {
    return this.db.select({ page: pages }).from(pages).leftJoin(folders, eq(folders.id, pages.folderId)).where(and(eq(pages.workspaceId, workspaceId), isNull(pages.deletedAt), isNull(folders.deletedAt)))
      .orderBy(desc(pages.updatedAt), desc(pages.id)).then(rows => rows.map(row => row.page))
  }

  async find(id: string): Promise<Page | null> {
    const [page] = await this.db.select({ page: pages }).from(pages).leftJoin(folders, eq(folders.id, pages.folderId)).where(and(eq(pages.id, id), isNull(pages.deletedAt), isNull(folders.deletedAt))).limit(1)
    return page?.page || null
  }

  async create(workspaceId: string, input: PageDraft, userId: string): Promise<Page> {
    const now = new Date()
    const page: Page = { id: uuidv7(), workspaceId, folderId: input.folderId ?? null,
      title: input.title, description: input.description ?? '', icon: input.icon ?? null,
      createdBy: userId, createdAt: now, updatedAt: now, deletedAt: null }
    await this.db.transaction(async (transaction) => {
      await transaction.insert(pages).values(page)
      await transaction.insert(documents).values({ pageId: page.id, markdown: '' })
    })
    return page
  }

  async update(id: string, input: PageChanges): Promise<void> {
    await this.db.update(pages).set({ ...input, updatedAt: new Date() }).where(and(eq(pages.id, id), isNull(pages.deletedAt)))
  }

  async move(id: string, folderId: string | null): Promise<void> {
    await this.db.update(pages).set({ folderId, updatedAt: new Date() }).where(and(eq(pages.id, id), isNull(pages.deletedAt)))
  }

  async delete(id: string): Promise<void> {
    const now = new Date()
    await this.db.update(pages).set({ deletedAt: now, updatedAt: now }).where(eq(pages.id, id))
  }
}
