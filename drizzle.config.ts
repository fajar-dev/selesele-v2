import { defineConfig } from 'drizzle-kit'
import { databaseConfig } from './server/infrastructure/database/config'

export default defineConfig({
  schema: './server/infrastructure/database/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: databaseConfig()
})
