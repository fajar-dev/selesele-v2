import { and, desc, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { PageInput, PageUpdate } from '../../../../shared/types/page'
import type { Page } from '../../../domain/entities/Page'
import type { PageRepository } from '../../../domain/ports/PageRepository'
import type { Database } from '../client'
import { documents, pages } from '../schema'

export class MySqlPageRepository implements PageRepository {
  constructor(private readonly db: Database) {}

  list(workspaceId: string): Promise<Page[]> {
    return this.db.select().from(pages).where(and(eq(pages.workspaceId, workspaceId), isNull(pages.deletedAt)))
      .orderBy(desc(pages.updatedAt), desc(pages.id))
  }

  async find(id: string): Promise<Page | null> {
    const [page] = await this.db.select().from(pages).where(and(eq(pages.id, id), isNull(pages.deletedAt))).limit(1)
    return page || null
  }

  async create(workspaceId: string, input: PageInput, userId: string): Promise<Page> {
    const now = new Date()
    const page: Page = { id: uuidv7(), workspaceId, folderId: input.folderId ?? null,
      title: input.title, icon: input.icon ?? null, description: input.description ?? null,
      createdBy: userId, createdAt: now, updatedAt: now, deletedAt: null }
    await this.db.transaction(async (transaction) => {
      await transaction.insert(pages).values(page)
      await transaction.insert(documents).values({ pageId: page.id, markdown: '' })
    })
    return page
  }

  async update(id: string, input: PageUpdate): Promise<void> {
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
