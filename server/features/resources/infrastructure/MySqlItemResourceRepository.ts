import { and, eq, or, desc } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Database } from '../../../platform/database/client'
import { itemAttachments, relatedItems, savedSearches } from '../../../platform/database/schema'
import type { ItemResourceRepository } from '../domain/ItemResourceRepository'
import type { ItemAttachment, ItemRelation, SavedSearch } from '../../../../shared/model/itemResources'

const attachmentColumns = { id: itemAttachments.id, itemId: itemAttachments.itemId, name: itemAttachments.name, mime: itemAttachments.mime, size: itemAttachments.size, anchor: itemAttachments.anchor, createdAt: itemAttachments.createdAt }
export class MySqlItemResourceRepository implements ItemResourceRepository {
  constructor(private readonly db: Database) { }
  async attachments(itemId: string) {
    return (await this.db.select(attachmentColumns).from(itemAttachments).where(eq(itemAttachments.itemId, itemId)).orderBy(desc(itemAttachments.createdAt))).map(row => ({ ...row, createdAt: row.createdAt.toISOString() }))
  }

  async attachment(itemId: string, id: string) {
    const [row] = await this.db.select().from(itemAttachments).where(and(eq(itemAttachments.id, id), eq(itemAttachments.itemId, itemId)))
    return row ? { ...row, createdAt: row.createdAt.toISOString() } : null
  }

  async attach(value: Omit<ItemAttachment, 'id' | 'createdAt'>, data: Uint8Array, userId: string) {
    const id = uuidv7()
    await this.db.insert(itemAttachments).values({ ...value, id, data: Buffer.from(data), createdBy: userId })
    return (await this.attachments(value.itemId)).find(row => row.id === id)!
  }

  async detach(itemId: string, id: string) {
    await this.db.delete(itemAttachments).where(and(eq(itemAttachments.itemId, itemId), eq(itemAttachments.id, id)))
  }

  async relations(itemId: string) {
    return this.db.select({ id: relatedItems.id, sourceId: relatedItems.sourceId, targetId: relatedItems.targetId, sourceAnchor: relatedItems.sourceAnchor, targetAnchor: relatedItems.targetAnchor, label: relatedItems.label }).from(relatedItems).where(or(eq(relatedItems.sourceId, itemId), eq(relatedItems.targetId, itemId)))
  }

  async relate(value: Omit<ItemRelation, 'id' | 'targetTitle' | 'targetKind' | 'workspaceId'>, userId: string) {
    const anchorKey = `${value.sourceAnchor?.type || ''}:${value.sourceAnchor?.id || ''}:${value.targetAnchor?.type || ''}:${value.targetAnchor?.id || ''}`
    await this.db.insert(relatedItems).values({ ...value, id: uuidv7(), anchorKey, createdBy: userId }).onDuplicateKeyUpdate({ set: { label: value.label } })
  }

  async unlink(itemId: string, id: string) {
    await this.db.delete(relatedItems).where(and(eq(relatedItems.id, id), eq(relatedItems.sourceId, itemId)))
  }

  async searches(userId: string) {
    return this.db.select({ id: savedSearches.id, name: savedSearches.name, query: savedSearches.query, workspaceId: savedSearches.workspaceId, filters: savedSearches.filters }).from(savedSearches).where(eq(savedSearches.userId, userId))
  }

  async saveSearch(userId: string, value: Omit<SavedSearch, 'id'>) {
    await this.db.insert(savedSearches).values({ ...value, id: uuidv7(), userId })
  }

  async removeSearch(userId: string, id: string) {
    await this.db.delete(savedSearches).where(and(eq(savedSearches.userId, userId), eq(savedSearches.id, id)))
  }
}
