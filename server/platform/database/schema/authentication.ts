import { mysqlTable, varchar, text, timestamp, boolean, index } from 'drizzle-orm/mysql-core'
import { uuidv7 } from 'uuidv7'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(uuidv7),
  email: varchar('email', { length: 255 }).notNull().unique(),
  microsoftSubject: varchar('microsoft_subject', { length: 73 }).unique(),
  googleSubject: varchar('google_subject', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }),
  avatar: text('avatar'),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  lastLoginAt: timestamp('last_login_at', { fsp: 3 }),
  createdAt: timestamp('created_at', { fsp: 3 }).defaultNow(),
  updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().$onUpdate(() => new Date()),
  invitationEmail: boolean('invitation_email').notNull().default(true),
  isActive: boolean('is_active').default(true)
})

export const sessions = mysqlTable('sessions', {
  tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  expiresAt: timestamp('expires_at', { fsp: 3 }).notNull()
}, table => [index('sessions_user_index').on(table.userId), index('sessions_expiry_index').on(table.expiresAt)])
