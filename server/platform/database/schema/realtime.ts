import { bigint, index, json, mysqlTable, primaryKey, customType, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import type { RealtimeTopic } from '../../../../shared/model/realtime'
import type { CanvasPresence } from '../../../../shared/model/presence'
import { items } from './items'
import { users } from './authentication'

/** Transactional change capture; sequence is assigned only after the source transaction commits. */
export const realtimeEvents = mysqlTable('realtime_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sequence: bigint('sequence', { mode: 'number', unsigned: true }),
  workspaceId: varchar('workspace_id', { length: 36 }),
  userId: varchar('user_id', { length: 36 }),
  topic: varchar('topic', { length: 24 }).notNull().$type<RealtimeTopic>(),
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow()
}, table => [uniqueIndex('realtime_events_sequence').on(table.sequence), index('realtime_events_retention').on(table.createdAt)])
export const realtimeClock = mysqlTable('realtime_clock', {
  id: varchar('id', { length: 16 }).primaryKey(),
  sequence: bigint('sequence', { mode: 'number', unsigned: true }).notNull().default(0)
})
export const canvasPresence = mysqlTable('canvas_presence', {
  sessionId: varchar('session_id', { length: 36 }).primaryKey(),
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  cursor: json('cursor').$type<CanvasPresence['cursor']>(),
  selected: json('selected').$type<string[]>().notNull(),
  updatedAt: timestamp('updated_at', { fsp: 3 }).notNull().defaultNow()
}, table => [index('canvas_presence_item').on(table.itemId, table.updatedAt)])

const documentPresenceBlob = customType<{ data: Buffer }>({ dataType: () => 'mediumblob' })
export const documentPresence = mysqlTable('document_presence', {
  itemId: varchar('item_id', { length: 36 }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  clientId: bigint('client_id', { mode: 'number', unsigned: true }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  state: documentPresenceBlob('state').notNull(),
  updatedAt: timestamp('updated_at', { fsp: 3 }).notNull().defaultNow()
}, table => [primaryKey({ columns: [table.itemId, table.clientId] }), index('document_presence_expiry').on(table.updatedAt)])
