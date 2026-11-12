import { DEFAULT_FOLDER_ICON } from '../../../../shared/kernel/icons'
import type { FolderChanges } from '../domain/Folder'
import { and, asc, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { FolderRepository } from '../domain/FolderRepository'
import type { Database } from '../../../platform/database/client'
import { folders, pages } from '../../../platform/database/schema'

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
    const folder = { id: uuidv7(), workspaceId, name, icon: DEFAULT_FOLDER_ICON, description: '', createdAt: now, updatedAt: now }
    await this.db.insert(folders).values(folder)
    return folder
  }

  async update(id: string, workspaceId: string, input: FolderChanges) {
    await this.db.update(folders).set({ ...input, updatedAt: new Date() }).where(and(eq(folders.id, id), eq(folders.workspaceId, workspaceId)))
  }

  async delete(id: string, workspaceId: string) {
    await this.db.transaction(async (transaction) => {
      await transaction.update(pages).set({ folderId: null, updatedAt: new Date() }).where(and(eq(pages.folderId, id), eq(pages.workspaceId, workspaceId)))
      await transaction.delete(folders).where(and(eq(folders.id, id), eq(folders.workspaceId, workspaceId)))
    })
  }
}
