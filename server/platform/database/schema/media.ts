import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core'
import { users } from './authentication'
import { items } from './items'

export const documentImages = mysqlTable('document_images', {
  filename: varchar('filename', { length: 48 }).primaryKey(),
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
})
