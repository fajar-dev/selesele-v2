import { strict as assert } from 'node:assert'
import { createConnection } from 'mysql2/promise'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { drizzle } from 'drizzle-orm/mysql2'
import { databaseConfig } from '../server/platform/database/config'

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
  await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  await migrate(drizzle(connection), { migrationsFolder: './drizzle' })
  console.log(`Rebuilt development database ${config.database} from the current baseline`)
} finally {
  await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  await connection.end()
}
