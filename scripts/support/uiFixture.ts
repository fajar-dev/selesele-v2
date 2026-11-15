import { randomUUID } from 'node:crypto'
import { createConnection } from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { createDatabase } from '../../server/platform/database/client'
import { databaseConfig } from '../../server/platform/database/config'
import { AuthService } from '../../server/features/authentication/application/AuthService'
import { MySqlUserRepository } from '../../server/features/authentication/infrastructure/MySqlUserRepository'
import { MySqlSessionRepository } from '../../server/features/authentication/infrastructure/MySqlSessionRepository'
import { CryptographicTokens } from '../../server/features/authentication/infrastructure/CryptographicTokens'
import { SystemClock } from '../../server/platform/runtime/SystemClock'

export async function createUiFixture(port = 13823) {
  const databaseName = `sele_ui_test_${randomUUID().replaceAll('-', '')}`, origin = `http://127.0.0.1:${port}`
  const admin = await createConnection({ ...databaseConfig(), database: undefined })
  let database: ReturnType<typeof createDatabase> | undefined, server: ReturnType<typeof Bun.spawn> | undefined
  const close = async () => {
    server?.kill('SIGTERM')
    await server?.exited
    await database?.close()
    await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``)
    await admin.end()
  }
  try {
    if (await fetch(`${origin}/api/health`).then(() => true, () => false)) {
      throw new Error('UI fixture port is already in use')
    }
    await admin.query(`CREATE DATABASE \`${databaseName}\``)
    await admin.changeUser({ database: databaseName })
    await migrate(drizzle(admin), { migrationsFolder: './drizzle' })
    const previous = process.env.DB_NAME
    process.env.DB_NAME = databaseName
    database = createDatabase()
    if (previous === undefined) {
      delete process.env.DB_NAME
    } else {
      process.env.DB_NAME = previous
    }
    const auth = new AuthService(new MySqlUserRepository(database.db), new MySqlSessionRepository(database.db), new CryptographicTokens(), new SystemClock())
    const accounts = []
    for (const name of ['UI Owner', 'UI Member', 'UI Viewer']) {
      accounts.push(await auth.login({ subject: randomUUID(), email: `${randomUUID()}@example.invalid`, name }, null))
    }
    server = Bun.spawn(['bun', '.output/server/index.mjs'], { env: { ...process.env, DB_NAME: databaseName, MAIL_ENABLED: 'false', APP_ORIGIN: origin, HOST: '127.0.0.1', PORT: String(port), NODE_ENV: 'production', AI_BASE_URL: '', AI_API_KEY: '', AI_MODEL: '' }, stdout: 'ignore', stderr: 'inherit' })
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await fetch(`${origin}/api/health`).then(result => result.ok, () => false)) {
        break
      }
      if (server.exitCode !== null) {
        throw new Error('UI fixture server exited')
      }
      await Bun.sleep(100)
    }
    async function request(actor: number, path: string, method = 'GET', body?: unknown) {
      const result = await fetch(`${origin}/api${path}`, { method, headers: { 'Cookie': `sele_session=${accounts[actor]!.token}`, 'Origin': origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      const value = await result.json() as {
        data: unknown
        message?: string
      }
      if (!result.ok) {
        throw new Error(`${method} ${path}: ${value.message}`)
      }
      return value.data
    }
    const workspace = await request(0, '/workspaces', 'POST', { name: 'UI Test Workspace' }) as {
      id: string
    }
    for (const [index, role] of [[1, 'member'], [2, 'viewer']] as const) {
      await request(0, `/workspaces/${workspace.id}/members`, 'POST', { emails: [accounts[index]!.user.email], role })
    }
    return { origin, databaseName, database: database.db, workspaceId: workspace.id, ownerToken: accounts[0]!.token, memberToken: accounts[1]!.token, viewerToken: accounts[2]!.token, request, close }
  } catch (cause) {
    await close()
    throw cause
  }
}
