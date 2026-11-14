import { strict as assert } from 'node:assert'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createDatabase } from '../server/platform/database/client'
import { sessions, users, workspaceMembers, workspaces } from '../server/platform/database/schema'
import { AuthService } from '../server/features/identity/application/AuthService'
import { MySqlUserRepository } from '../server/features/identity/infrastructure/MySqlUserRepository'
import { MySqlSessionRepository } from '../server/features/identity/infrastructure/MySqlSessionRepository'
import { CryptographicTokens } from '../server/features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../server/platform/runtime/SystemClock'

const origin = new URL(process.env.SMOKE_ORIGIN || 'http://localhost:3000')
assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname), 'Development checks require a local server')
const db = createDatabase()
const auth = new AuthService(new MySqlUserRepository(db.db), new MySqlSessionRepository(db.db), new CryptographicTokens(), new SystemClock())
const identity = await auth.login({ subject: `${randomUUID()}:${randomUUID()}`, email: `dev-ui-${randomUUID()}@example.invalid`, name: 'Development UI audit' }, null)
let workspaceId: string | undefined
try {
  const headers = { 'Cookie': `sele_session=${identity.token}`, 'Origin': origin.origin, 'Content-Type': 'application/json' }
  const created = await fetch(new URL('/api/workspaces', origin), { method: 'POST', headers, body: JSON.stringify({ name: 'Development UI fixture' }), signal: AbortSignal.timeout(60000) })
  assert.equal(created.status, 201)
  workspaceId = ((await created.json()) as {
    data: {
      id: string
    }
  }).data.id
  const screens = { members: 'People, groups', settings: 'Workspace identity', ask: 'Explore your workspace', archive: 'Completed items', templates: 'A head start for your next idea' }
  for (const [section, expected] of Object.entries(screens)) {
    const response = await fetch(new URL(`/workspaces/${workspaceId}/${section}`, origin), { headers, redirect: 'manual', signal: AbortSignal.timeout(60000) })
    const html = await response.text()
    assert.equal(response.status, 200, `${section}: authenticated development SSR must succeed`)
    assert.ok(!html.includes('Server Error') && !html.includes('__vite_ssr_import_0__.z.enum'), `${section}: schema imports must evaluate`)
    assert.ok(html.includes(expected), `Expected ${section} item markup`)
  }
  const tasks = await fetch(new URL('/tasks', origin), { headers, signal: AbortSignal.timeout(60000) })
  assert.equal(tasks.status, 200)
  assert.ok((await tasks.text()).includes('Tasks assigned to you'))
  console.log('Development SSR passed: Members, Settings, Ask, Archive and Templates render with authenticated fixtures; no email is sent')
} finally {
  if (workspaceId) {
    await db.db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId))
    await db.db.delete(workspaces).where(eq(workspaces.id, workspaceId))
  }
  await db.db.delete(sessions).where(eq(sessions.userId, identity.user.id))
  await db.db.delete(users).where(eq(users.id, identity.user.id))
  await db.close()
}
