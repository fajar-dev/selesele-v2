import * as Y from 'yjs'
import { createDocument } from '../../../platform/collaboration/document'
import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import { canvasContentSchema } from '../../../../shared/validation/canvas'
import { validateCanvas, canvasSearchText } from '../../canvases/domain/canvasPolicy'
import { emptyCanvas, itemTypeIcons } from '../../../../shared/model/content'
import { documentLinks } from '../../library/domain/documentLinks'
import type { ItemDraft, ItemChanges, Item } from '../domain/Item'
import { and, desc, eq, isNull, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { ItemRepository } from '../domain/ItemRepository'
import type { Database } from '../../../platform/database/client'
import { documents, items, folders, itemLinks, canvases, itemAttachments } from '../../../platform/database/schema'

export class MySqlItemRepository implements ItemRepository {
  constructor(private readonly db: Database) {
  }

  list(workspaceId: string): Promise<Item[]> {
    return this.db.select({ item: items }).from(items).leftJoin(folders, eq(folders.id, items.folderId)).where(and(eq(items.workspaceId, workspaceId), isNull(items.deletedAt), isNull(folders.deletedAt)))
      .orderBy(desc(items.updatedAt), desc(items.id)).then(rows => rows.map(row => row.item))
  }

  async find(id: string): Promise<Item | null> {
    const [item] = await this.db.select({ item: items }).from(items).leftJoin(folders, eq(folders.id, items.folderId)).where(and(eq(items.id, id), isNull(items.deletedAt), isNull(folders.deletedAt))).limit(1)
    return item?.item || null
  }

  async create(workspaceId: string, input: ItemDraft, userId: string, content = ''): Promise<Item> {
    const now = new Date()
    const item: Item = { kind: input.kind || 'document', id: uuidv7(), workspaceId, folderId: input.folderId ?? null,
      title: input.title, description: input.description ?? '', icon: input.icon ?? itemTypeIcons[input.kind || 'document'],
      createdBy: userId, createdAt: now, updatedAt: now, deletedAt: null }
    await this.db.transaction(async (transaction) => {
      await transaction.insert(items).values(item)
      if (item.kind === 'document') {
        const document = createDocument(content, null)
        try {
          await transaction.insert(documents).values({ itemId: item.id, markdown: content, state: Buffer.from(Y.encodeStateAsUpdate(document)) })
        } finally {
          document.destroy()
        }
      } else {
        const initial = content ? canvasContentSchema.parse(JSON.parse(content)) : emptyCanvas(item.kind)
        validateCanvas(initial, item.kind)
        if (initial.kind === 'whiteboard') {
          const imageIds = [...new Set(initial.elements.flatMap(element => element.imageId ? [element.imageId] : []))]
          if (imageIds.length) {
            const allowed = (await loadResourceScope(transaction, userId, workspaceId)).allowed('item')
            const images = allowed.length ? await transaction.select().from(itemAttachments).where(and(inArray(itemAttachments.id, imageIds), inArray(itemAttachments.itemId, allowed))) : []
            if (images.length !== imageIds.length) {
              throw new ApplicationError('invalid_input', 'A template image is missing or no longer accessible')
            }
            for (const image of images) {
              const imageId = uuidv7()
              await transaction.insert(itemAttachments).values({ ...image, id: imageId, itemId: item.id, anchor: null, createdBy: userId, createdAt: now })
              initial.elements.forEach((element) => {
                if (element.imageId === image.id) {
                  element.imageId = imageId
                }
              })
            }
          }
        }
        await transaction.insert(canvases).values({ itemId: item.id, content: initial, summary: canvasSearchText(initial) })
      }
      const targets = documentLinks(content).filter(id => id !== item.id)
      if (targets.length) {
        const valid = await transaction.select({ id: items.id }).from(items).where(and(eq(items.workspaceId, workspaceId), inArray(items.id, targets)))
        if (valid.length) {
          await transaction.insert(itemLinks).values(valid.map(row => ({ sourceId: item.id, targetId: row.id })))
        }
      }
    })
    return item
  }

  async update(id: string, input: ItemChanges): Promise<void> {
    await this.db.update(items).set({ ...input, updatedAt: new Date() }).where(and(eq(items.id, id), isNull(items.deletedAt)))
  }

  async delete(id: string): Promise<void> {
    const now = new Date()
    await this.db.update(items).set({ deletedAt: now, updatedAt: now }).where(eq(items.id, id))
  }

  async archive(id: string, archived: boolean) {
    await this.db.update(items).set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(items.id, id), isNull(items.deletedAt)))
  }
}
