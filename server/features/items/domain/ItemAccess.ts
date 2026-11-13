import type { Item } from './Item'

export interface ItemAccess {
  commentable(itemId: string, userId: string): Promise<Item>
  writable(itemId: string, userId: string): Promise<Item>
  get(itemId: string, userId: string): Promise<Item>
}
