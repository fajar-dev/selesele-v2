import { drizzle } from 'drizzle-orm/mysql2'
import { createPool } from 'mysql2/promise'
import { databaseConfig } from './config'
import * as schema from './schema'

export function createDatabase() {
  const pool = createPool({
    ...databaseConfig(),
    connectionLimit: 10,
    queueLimit: 100,
    enableKeepAlive: true,
    timezone: 'Z'
  })
  return { db: drizzle(pool, { mode: 'default', schema }), close: () => pool.end() }
}

export type Database = ReturnType<typeof createDatabase>['db']
