import type { ItemAttachment, SavedSearch, ItemRelation } from '../../../../shared/model/itemResources'

export interface ItemResourceRepository {
  attachments(itemId: string): Promise<ItemAttachment[]>
  attachment(itemId: string, id: string): Promise<(ItemAttachment & { data: Uint8Array }) | null>
  attach(value: Omit<ItemAttachment, 'id' | 'createdAt'>, data: Uint8Array, userId: string): Promise<ItemAttachment>
  detach(itemId: string, id: string): Promise<void>
  relations(itemId: string): Promise<Omit<ItemRelation, 'targetTitle' | 'targetKind' | 'workspaceId'>[]>
  relate(value: Omit<ItemRelation, 'id' | 'targetTitle' | 'targetKind' | 'workspaceId'>, userId: string): Promise<void>
  unlink(itemId: string, id: string): Promise<void>
  searches(userId: string): Promise<SavedSearch[]>
  saveSearch(userId: string, value: Omit<SavedSearch, 'id'>): Promise<void>
  removeSearch(userId: string, id: string): Promise<void>
}
