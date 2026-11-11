import { and, asc, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { FolderRepository } from '../../../domain/ports/FolderRepository'
import type { Database } from '../client'
import { folders, pages } from '../schema'

export class MySqlFolderRepository implements FolderRepository {
  constructor(private readonly db: Database) {}

  list(workspaceId: string) {
    return this.db.select().from(folders).where(eq(folders.workspaceId, workspaceId)).orderBy(asc(folders.name), asc(folders.id))
  }

  async find(id: string, workspaceId: string) {
    const [folder] = await this.db.select().from(folders).where(and(eq(folders.id, id), eq(folders.workspaceId, workspaceId))).limit(1)
    return folder || null
  }

  async create(workspaceId: string, name: string) {
    const now = new Date()
    const folder = { id: uuidv7(), workspaceId, name, createdAt: now, updatedAt: now }
    await this.db.insert(folders).values(folder)
    return folder
  }

  async rename(id: string, workspaceId: string, name: string) {
    await this.db.update(folders).set({ name, updatedAt: new Date() }).where(and(eq(folders.id, id), eq(folders.workspaceId, workspaceId)))
  }

  async delete(id: string, workspaceId: string) {
    await this.db.transaction(async (transaction) => {
      await transaction.update(pages).set({ folderId: null, updatedAt: new Date() }).where(and(eq(pages.folderId, id), eq(pages.workspaceId, workspaceId)))
      await transaction.delete(folders).where(and(eq(folders.id, id), eq(folders.workspaceId, workspaceId)))
    })
  }
}
