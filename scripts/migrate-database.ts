import { createConnection } from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { databaseConfig } from '../server/platform/database/config'

const connection = await createConnection(databaseConfig())
try {
  await migrate(drizzle(connection), { migrationsFolder: './drizzle' })
  console.log('Database migrations completed')
} finally {
  await connection.end()
}
