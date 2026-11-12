import { defineConfig } from 'drizzle-kit'
import { databaseConfig } from './server/platform/database/config'

export default defineConfig({
  schema: './server/platform/database/schema/index.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: databaseConfig()
})
