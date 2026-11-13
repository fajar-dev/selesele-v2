import type { ItemDraft, ItemChanges, Item } from './Item'

export interface ItemRepository {
  list(workspaceId: string): Promise<Item[]>
  find(id: string): Promise<Item | null>
  create(workspaceId: string, input: ItemDraft, userId: string, content?: string): Promise<Item>
  update(id: string, input: ItemChanges): Promise<void>
  delete(id: string): Promise<void>
  archive(id: string, archived: boolean): Promise<void>
}
