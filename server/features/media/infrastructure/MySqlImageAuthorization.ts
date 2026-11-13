import { eq } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { imageUploads } from '../../../platform/database/schema'
import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import type { ImageAuthorization } from '../domain/ImageAuthorization'
/** An image retains its source page's permissions even when its URL is copied. */
export class MySqlImageAuthorization implements ImageAuthorization {
  constructor(private readonly db: Database) { }
  async register(filename: string, userId: string, pageId: string) {
    await this.db.insert(imageUploads).values({ filename, userId, pageId })
  }

  async canRead(filename: string, userId: string) {
    const [upload] = await this.db.select({ pageId: imageUploads.pageId }).from(imageUploads).where(eq(imageUploads.filename, filename)).limit(1)
    if (!upload) {
      return false
    }
    const scope = await loadResourceScope(this.db, userId)
    return scope.allowed('page').includes(upload.pageId)
  }

  async canUpload(pageId: string, userId: string) {
    const scope = await loadResourceScope(this.db, userId)
    return scope.allowed('page', 'edit').includes(pageId) && scope.memberships.some(row => row.workspace.id === scope.notes.find(page => page.id === pageId)?.workspaceId && !row.workspace.archivedAt)
  }
}
