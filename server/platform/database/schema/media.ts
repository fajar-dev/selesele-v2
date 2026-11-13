import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core'
import { users } from './identity'
import { pages } from './pages'

export const imageUploads = mysqlTable('image_uploads', {
  filename: varchar('filename', { length: 48 }).primaryKey(),
  pageId: varchar('page_id', { length: 36 }).notNull().references(() => pages.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow()
})
