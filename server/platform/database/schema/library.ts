import { mysqlTable, varchar, timestamp, index, primaryKey } from 'drizzle-orm/mysql-core'
import { items } from './items'
import { users } from './authentication'

export const itemPreferences = mysqlTable('item_preferences', {
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  favoriteAt: timestamp('favorite_at', { fsp: 3 }),
  visitedAt: timestamp('visited_at', { fsp: 3 })
}, table => [primaryKey({ columns: [table.userId, table.itemId] }), index('item_preferences_recent').on(table.userId, table.visitedAt)])
export const itemLinks = mysqlTable('item_links', {
  sourceId: varchar('source_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  targetId: varchar('target_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' })
}, table => [primaryKey({ columns: [table.sourceId, table.targetId] }), index('item_links_target').on(table.targetId)])
export const itemMentions = mysqlTable('item_mentions', {
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' })
}, table => [primaryKey({ columns: [table.itemId, table.userId] })])
