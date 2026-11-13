import { eq } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { imageUploads } from '../../../platform/database/schema'
import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import type { ImageAuthorization } from '../domain/ImageAuthorization'
/** An image retains its source item's permissions even when its URL is copied. */
export class MySqlImageAuthorization implements ImageAuthorization {
  constructor(private readonly db: Database) {
  }

  async register(filename: string, userId: string, itemId: string) {
    await this.db.insert(imageUploads).values({ filename, userId, itemId })
  }

  async canRead(filename: string, userId: string) {
    const [upload] = await this.db.select({ itemId: imageUploads.itemId }).from(imageUploads).where(eq(imageUploads.filename, filename)).limit(1)
    if (!upload) {
      return false
    }
    const scope = await loadResourceScope(this.db, userId)
    return scope.allowed('item').includes(upload.itemId)
  }

  async canUpload(itemId: string, userId: string) {
    const scope = await loadResourceScope(this.db, userId)
    return scope.allowed('item', 'edit').includes(itemId) && scope.memberships.some(row => row.workspace.id === scope.notes.find(item => item.id === itemId)?.workspaceId && !row.workspace.archivedAt)
  }
}
