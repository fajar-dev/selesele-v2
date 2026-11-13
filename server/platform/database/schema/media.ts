import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core'
import { users } from './identity'
import { items } from './items'

export const imageUploads = mysqlTable('image_uploads', {
  filename: varchar('filename', { length: 48 }).primaryKey(),
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow()
})
