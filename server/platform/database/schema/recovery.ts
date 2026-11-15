import { mysqlTable, varchar, timestamp, longtext, index } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'
import { items } from './items'
import { users } from './authentication'

export const itemVersions = mysqlTable('item_versions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  content: longtext('content').notNull(),
  authorId: varchar('author_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('item_versions_item_time').on(table.itemId, table.createdAt)])
