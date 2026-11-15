import { mysqlTable, varchar, timestamp, json, int, customType, index, uniqueIndex } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { items } from './items'
import { users } from './authentication'
import type { ObjectReference, SearchFilters } from '../../../../shared/model/itemResources'

const blob = customType<{ data: Buffer }>({ dataType: () => 'mediumblob' })
export const itemAttachments = mysqlTable('item_attachments', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7), itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), mime: varchar('mime', { length: 100 }).notNull(), size: int('size').notNull(), data: blob('data').notNull(), anchor: json('anchor').$type<ObjectReference | null>(),
  createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id), createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('attachments_item').on(table.itemId)])
export const relatedItems = mysqlTable('related_items', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7), sourceId: varchar('source_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }), targetId: varchar('target_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  sourceAnchor: json('source_anchor').$type<ObjectReference | null>(), targetAnchor: json('target_anchor').$type<ObjectReference | null>(), anchorKey: varchar('anchor_key', { length: 160 }).notNull(), label: varchar('label', { length: 120 }).notNull().default('Related'), createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id)
}, table => [uniqueIndex('relation_unique').on(table.sourceId, table.targetId, table.anchorKey), index('relation_target').on(table.targetId)])
export const savedSearches = mysqlTable('saved_searches', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7), userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }), name: varchar('name', { length: 80 }).notNull(), query: varchar('query', { length: 160 }).notNull(), workspaceId: varchar('workspace_id', { length: 36 }), filters: json('filters').$type<SearchFilters>().notNull()
}, table => [index('saved_search_user').on(table.userId)])
