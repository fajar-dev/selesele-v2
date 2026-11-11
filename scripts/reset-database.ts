import { strict as assert } from 'node:assert'
import { createConnection } from 'mysql2/promise'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { databaseConfig } from '../server/infrastructure/database/config'
import { createDatabase } from '../server/infrastructure/database/client'

const config = databaseConfig()
assert.notEqual(process.env.NODE_ENV, 'production', 'Database reset is disabled in production')
assert.ok(['localhost', '127.0.0.1', '::1'].includes(config.host), 'Database reset is restricted to local development MySQL')
const connection = await createConnection(config)
try {
  const [rows] = await connection.query('SHOW TABLES')
  await connection.query('SET FOREIGN_KEY_CHECKS = 0')
  for (const row of rows as Record<string, string>[]) {
    const table = Object.values(row)[0]!
    await connection.query(`DROP TABLE ${connection.escapeId(table)}`)
  }
} finally {
  await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  await connection.end()
}
const database = createDatabase()
try {
  await migrate(database.db, { migrationsFolder: './drizzle' })
  console.log(`Rebuilt development database ${config.database} with the workspace schema`)
} finally {
  await database.close()
}
