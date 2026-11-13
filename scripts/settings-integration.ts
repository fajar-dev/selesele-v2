import { strict as assert } from 'node:assert'
import { randomUUID } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { createConnection } from 'mysql2/promise'
import { createDatabase } from '../server/platform/database/client'
import { databaseConfig } from '../server/platform/database/config'
import { emailDeliveries, pages, workspaceActivity } from '../server/platform/database/schema'
import { AuthService } from '../server/features/identity/application/AuthService'
import { MySqlUserRepository } from '../server/features/identity/infrastructure/MySqlUserRepository'
import { MySqlSessionRepository } from '../server/features/identity/infrastructure/MySqlSessionRepository'
import { CryptographicTokens } from '../server/features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../server/platform/runtime/SystemClock'
import { MySqlNotificationRepository } from '../server/features/notifications/infrastructure/MySqlNotificationRepository'
import { MySqlEmailOutbox } from '../server/features/mail/infrastructure/MySqlEmailOutbox'
import { EmailDeliveryService } from '../server/features/mail/application/EmailDeliveryService'
import { WorkspaceMaintenance } from '../server/features/settings/infrastructure/WorkspaceMaintenance'
import { MySqlWorkspaceJournal } from '../server/features/settings/infrastructure/MySqlWorkspaceJournal'
import { MySqlRecoveryRepository } from '../server/features/recovery/infrastructure/MySqlRecoveryRepository'
import { defaultNotificationPreferences, defaultWorkspaceSettings } from '../shared/kernel/workspaceSettings'
import type { WorkspaceSettings, WorkspaceActivityPage } from '../shared/contracts/workspaceSettings'

const databaseName = `sele_settings_test_${randomUUID().replaceAll('-', '')}`
const admin = await createConnection({ ...databaseConfig(), database: undefined, timezone: 'Z' })
let database: ReturnType<typeof createDatabase> | undefined
let server: ReturnType<typeof Bun.spawn> | undefined
const origin = 'http://127.0.0.1:13812'
const accounts: {
  userId: string
  token: string
  email: string
}[] = []
async function request<T>(actor: number, path: string, method = 'GET', body?: unknown, expected = 200): Promise<T> {
  const response = await fetch(`${origin}/api${path}`, { method, headers: { 'Cookie': `sele_session=${accounts[actor]!.token}`, 'Origin': origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) })
  assert.equal(response.status, expected, `${method} ${path}`)
  return (await response.json() as {
    data: T
  }).data
}
try {
  await admin.query(`CREATE DATABASE \`${databaseName}\``)
  await admin.changeUser({ database: databaseName })
  await migrate(drizzle(admin), { migrationsFolder: './drizzle' })
  process.env.DB_NAME = databaseName
  database = createDatabase()
  const db = database.db
  const auth = new AuthService(new MySqlUserRepository(db), new MySqlSessionRepository(db), new CryptographicTokens(), new SystemClock())
  for (const name of ['Owner', 'Member', 'Admin', 'Outsider']) {
    const email = `${name.toLowerCase()}-${randomUUID()}@example.invalid`
    const account = await auth.login({ subject: `${randomUUID()}:${randomUUID()}`, email, name }, null)
    accounts.push({ userId: account.user.id, token: account.token, email })
  }
  assert.ok(!await fetch(`${origin}/api/health`).then(() => true, () => false), 'Settings integration port is occupied')
  server = Bun.spawn(['bun', '.output/server/index.mjs'], { env: { ...process.env, DB_NAME: databaseName, MAIL_ENABLED: 'false', APP_ORIGIN: origin, HOST: '127.0.0.1', PORT: '13812', NODE_ENV: 'production' }, stdout: 'inherit', stderr: 'inherit' })
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(server.exitCode, null)
    if (await fetch(`${origin}/api/health`).then(response => response.ok, () => false)) {
      ready = true
      break
    }
    await Bun.sleep(100)
  }
  assert.ok(ready)
  const workspace = await request<{
    id: string
  }>(0, '/workspaces', 'POST', { name: 'Governance' }, 201)
  const base = `/workspaces/${workspace.id}`
  for (const [actor, role] of [[1, 'member'], [2, 'admin']] as const) {
    await request(0, `${base}/members`, 'POST', { emails: [accounts[actor]!.email], role }, 201)
  }
  await request(0, `${base}/settings`, 'PATCH', {}, 400)
  await request(0, `${base}/settings`, 'PATCH', { role: 'admin' }, 400)
  const independentRules = defaultWorkspaceSettings().permissions
  independentRules.createPages = 'managers'
  await Promise.all([
    request(0, `${base}/settings`, 'PATCH', { permissions: independentRules }),
    request(0, `${base}/settings`, 'PATCH', { trashRetentionDays: 30 })
  ])
  const merged = await request<{ settings: WorkspaceSettings }>(0, `${base}/settings`)
  assert.equal(merged.settings.trashRetentionDays, 30, 'Concurrent section saves preserve retention')
  assert.equal(merged.settings.permissions.createPages, 'managers', 'Concurrent section saves preserve rules')
  await request(0, `${base}/settings`, 'PATCH', defaultWorkspaceSettings())
  for (const path of ['settings', 'activity', 'usage', 'export']) {
    await request(3, `${base}/${path}`, 'GET', undefined, 404)
  }
  await request(1, `${base}/activity`, 'GET', undefined, 403)
  const policy: WorkspaceSettings = defaultWorkspaceSettings()
  policy.permissions = { inviteMembers: 'managers', createPages: 'managers', createFolders: 'managers', deleteContent: 'managers' }
  await request(1, `${base}/settings`, 'PATCH', policy, 403)
  await request(0, `${base}/settings`, 'PATCH', policy)
  await request(1, `${base}/pages`, 'POST', { title: 'Blocked' }, 403)
  await request(1, `${base}/folders`, 'POST', { name: 'Blocked' }, 403)
  await request(1, `${base}/members`, 'POST', { emails: ['blocked@example.invalid'], role: 'member' }, 403)
  const folder = await request<{
    id: string
  }>(2, `${base}/folders`, 'POST', { name: 'Plans' }, 201)
  const page = await request<{
    id: string
  }>(0, `${base}/pages`, 'POST', { title: 'Launch', folderId: folder.id }, 201)
  await request(0, `/pages/${page.id}/content`, 'POST', { content: '# Launch\n\nReview the final plan.' })
  await request(1, `/pages/${page.id}`, 'DELETE', undefined, 403)
  policy.homePageId = page.id
  policy.permissions.inviteMembers = 'members'
  await request(0, `${base}/settings`, 'PATCH', policy)
  await request(1, `${base}/members`, 'POST', { emails: ['guest@example.invalid'], role: 'admin' }, 403)
  await request(1, `${base}/members`, 'POST', { emails: ['guest@example.invalid'], role: 'member' }, 201)
  const other = await request<{
    id: string
  }>(3, '/workspaces', 'POST', { name: 'Private' }, 201)
  const privatePage = await request<{
    id: string
  }>(3, `/workspaces/${other.id}/pages`, 'POST', { title: 'Private page' }, 201)
  await request(0, `${base}/settings`, 'PATCH', { ...policy, homePageId: privatePage.id }, 404)
  await request(0, `/pages/${page.id}/access`, 'PUT', { mode: 'restricted', grants: [] })
  await request(2, `${base}/settings`, 'PATCH', { trashRetentionDays: 30 })
  const adminSettings = await request<{ settings: WorkspaceSettings }>(2, `${base}/settings`)
  assert.equal(adminSettings.settings.homePageId, page.id, 'Saving another section must not revalidate or replace a private opening page')
  await request(0, `/pages/${page.id}/access`, 'PUT', { mode: 'inherit', grants: [] })
  await request(0, `${base}/settings`, 'PATCH', { trashRetentionDays: 0 })
  await request(0, `${base}/archive`, 'POST', { archived: true })
  await request(0, `${base}/pages`, 'POST', { title: 'Archived write' }, 403)
  await request(0, `/pages/${page.id}/content`, 'POST', { content: 'Blocked' }, 403)
  assert.ok((await request<{
    content: string
  }>(1, `/pages/${page.id}/content`)).content.includes('Review'))
  await request(2, `${base}/archive`, 'POST', { archived: false }, 403)
  await request(0, `${base}/archive`, 'POST', { archived: false })
  const preferences = defaultNotificationPreferences()
  preferences.email.mention = false
  await request(1, `${base}/notification-preferences`, 'PATCH', preferences)
  const notifications = new MySqlNotificationRepository(db, true)
  await notifications.mentions(page.id, [accounts[1]!.userId], accounts[0]!.userId)
  assert.equal((await db.select().from(emailDeliveries)).length, 0, 'Muted email does not enqueue')
  preferences.email.mention = true
  preferences.delivery = 'daily'
  await request(1, `${base}/notification-preferences`, 'PATCH', preferences)
  await notifications.mentions(page.id, [accounts[1]!.userId], accounts[0]!.userId)
  await notifications.mentions(page.id, [accounts[1]!.userId], accounts[0]!.userId)
  let sent = 0
  const outbox = new MySqlEmailOutbox(db)
  const due = new Date(Date.now() + 48 * 3600000)
  const delivery = new EmailDeliveryService(outbox, { async send(message) {
    sent++
    assert.ok(message.subject.includes('Daily summary'))
    assert.ok(message.html.includes('2 updates'))
  } }, { now: () => due }, origin)
  assert.equal(await delivery.deliverNext(), true)
  assert.equal(sent, 1, 'Two daily jobs produce one email')
  assert.ok((await db.select().from(emailDeliveries)).every(row => row.state === 'sent'))
  await notifications.mentions(page.id, [accounts[1]!.userId], accounts[0]!.userId)
  preferences.email.mention = false
  await request(1, `${base}/notification-preferences`, 'PATCH', preferences)
  await delivery.deliverNext()
  assert.equal(sent, 1, 'Queued email rechecks preferences before SMTP')
  const exported = await fetch(`${origin}/api${base}/export`, { headers: { Cookie: `sele_session=${accounts[0]!.token}` } })
  assert.equal(exported.status, 200)
  const archive = await new Bun.Archive(await exported.arrayBuffer()).files()
  assert.ok(archive.has('workspace.json'))
  assert.ok([...archive.keys()].some(path => path.endsWith(`${page.id}.md`)))
  const usage = await request<{
    pages: number
    folders: number
    members: number
  }>(0, `${base}/usage`)
  assert.deepEqual([usage.pages, usage.folders, usage.members], [1, 1, 4])
  const journal = new MySqlWorkspaceJournal(db)
  for (let index = 0; index < 55; index++) {
    await journal.record(workspace.id, accounts[0]!.userId, 'workspace.updated', `Change ${index}`)
  }
  const first = await request<WorkspaceActivityPage>(0, `${base}/activity`)
  assert.equal(first.items.length, 50)
  assert.ok(first.nextCursor)
  const second = await request<WorkspaceActivityPage>(0, `${base}/activity?cursor=${first.nextCursor}`)
  assert.ok(second.items.every(item => !first.items.some(previous => previous.id === item.id)))
  const expiring = await request<{
    id: string
  }>(0, `${base}/pages`, 'POST', { title: 'Old deleted page' }, 201)
  await request(0, `/pages/${expiring.id}`, 'DELETE')
  await db.update(pages).set({ deletedAt: new Date(Date.now() - 10 * 86400000) }).where(eq(pages.id, expiring.id))
  policy.trashRetentionDays = 7
  await request(0, `${base}/settings`, 'PATCH', policy)
  const recovery = new MySqlRecoveryRepository(db)
  const maintenance = new WorkspaceMaintenance(db, recovery, journal, { report(_message, error) {
    throw error
  } })
  class RestoredDuringRetention extends MySqlRecoveryRepository {
    override async purge() {
      return false
    }
  }
  const purgeEvents = () => db.select({ id: workspaceActivity.id }).from(workspaceActivity).where(and(eq(workspaceActivity.workspaceId, workspace.id), eq(workspaceActivity.action, 'content.purged')))
  const previousEvents = (await purgeEvents()).length
  await new WorkspaceMaintenance(db, new RestoredDuringRetention(db), journal, { report(_message, cause) {
    throw cause
  } }).run()
  assert.equal((await purgeEvents()).length, previousEvents, 'A skipped purge does not record a false deletion event')
  await maintenance.run()
  assert.equal((await db.select().from(pages).where(eq(pages.id, expiring.id))).length, 0, 'Retention removes expired Trash')
  assert.equal(await recovery.purge('page', page.id, new Date()), false, 'No-op purge reports that nothing was deleted')
  assert.equal((await db.select().from(pages).where(eq(pages.id, page.id))).length, 1, 'Purge cannot remove a restored/live page')
  await request(0, `${base}/leave`, 'POST', undefined, 409)
  await request(1, `${base}/ownership`, 'POST', { userId: accounts[1]!.userId }, 403)
  await request(0, `${base}/ownership`, 'POST', { userId: accounts[3]!.userId }, 409)
  await request(0, `${base}/ownership`, 'POST', { userId: accounts[1]!.userId })
  await request(0, `${base}/archive`, 'POST', { archived: true }, 403)
  await request(1, `${base}/archive`, 'POST', { archived: true })
  await request(0, `${base}/leave`, 'POST')
  await request(0, `${base}/settings`, 'GET', undefined, 404)
  console.log('Settings integration passed: permissions, isolation, archive read-only, landing page, personal notifications, SMTP digest grouping, queued preference checks, export, usage, audit pagination, retention, owner transfer and leave')
} finally {
  if (server) {
    server.kill('SIGTERM')
    const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000)
    try {
      await server.exited
    } finally {
      clearTimeout(timeout)
    }
  }
  await database?.close()
  await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``)
  await admin.end()
}
