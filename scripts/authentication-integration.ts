import { strict as assert } from 'node:assert'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { createUiFixture } from './support/uiFixture'
import { AuthService } from '../server/features/authentication/application/AuthService'
import { MySqlUserRepository } from '../server/features/authentication/infrastructure/MySqlUserRepository'
import { MySqlSessionRepository } from '../server/features/authentication/infrastructure/MySqlSessionRepository'
import { CryptographicTokens } from '../server/features/authentication/infrastructure/CryptographicTokens'
import { SystemClock } from '../server/platform/runtime/SystemClock'
import { users, workspaceMembers } from '../server/platform/database/schema'

const fixture = await createUiFixture(13827)
let server: ReturnType<typeof Bun.spawn> | undefined
async function stop() {
  server?.kill('SIGTERM')
  await server?.exited
  server = undefined
}
try {
  const db = fixture.database
  const auth = new AuthService(new MySqlUserRepository(db), new MySqlSessionRepository(db), new CryptographicTokens(), new SystemClock())
  const email = `${randomUUID()}@example.invalid`
  await fixture.request(0, `/workspaces/${fixture.workspaceId}/members`, 'POST', { emails: [email], role: 'member' })
  const identity = { provider: 'google' as const, subject: randomUUID(), email, name: 'Google member' }
  const first = await auth.login(identity, '127.0.0.1')
  const second = await auth.login(identity, null)
  assert.equal(first.user.id, second.user.id, 'Repeated Google login preserves the account')
  assert.equal((await auth.authenticate(first.token)).email, email)
  const [account] = await db.select().from(users).where(eq(users.id, first.user.id))
  assert.equal(account!.googleSubject, identity.subject)
  assert.equal(account!.microsoftSubject, null)
  const [member] = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, fixture.workspaceId), eq(workspaceMembers.email, email)))
  assert.equal(member!.userId, first.user.id, 'Google login claims the email invitation')
  await assert.rejects(auth.login({ ...identity, provider: 'microsoft' }, null), { code: 'unauthenticated' })
  await assert.rejects(auth.login({ ...identity, subject: randomUUID() }, null), { code: 'unauthenticated' })
  const microsoft = await auth.login({ ...identity, provider: 'microsoft', email: `${randomUUID()}@example.invalid` }, null)
  assert.notEqual(microsoft.user.id, first.user.id, 'Subjects are scoped to their provider')
  await assert.rejects(auth.login({ ...identity, email: microsoft.user.email }, null), { code: 'unauthenticated' })
  assert.equal((await auth.authenticate(second.token)).email, email, 'Rejected collisions do not modify the original account')
  await db.update(users).set({ isActive: false }).where(eq(users.id, first.user.id))
  await assert.rejects(auth.login(identity, null), { code: 'forbidden' })
  await assert.rejects(auth.authenticate(first.token), { code: 'unauthenticated' })

  const origin = 'http://127.0.0.1:13828'
  for (const [microsoftEnabled, googleEnabled] of [[true, true], [false, true], [true, false], [false, false]]) {
    server = Bun.spawn(['bun', '.output/server/index.mjs'], {
      env: { ...process.env, DB_NAME: fixture.databaseName, PORT: '13828', HOST: '127.0.0.1', APP_ORIGIN: origin,
        NODE_ENV: 'production', MAIL_ENABLED: 'false', MICROSOFT_ENABLED: String(microsoftEnabled), GOOGLE_ENABLED: String(googleEnabled),
        MICROSOFT_CLIENT_ID: '', MICROSOFT_CLIENT_SECRET: '', MICROSOFT_TENANT_ID: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' },
      stdout: 'ignore', stderr: 'inherit'
    })
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await fetch(`${origin}/api/health`).then(response => response.ok, () => false)) {
        ready = true
        break
      }
      await Bun.sleep(100)
    }
    assert.ok(ready, 'Authentication test server started')
    const response = await fetch(`${origin}/api/auth/providers`)
    assert.equal(response.status, 200, 'Provider discovery is public')
    assert.deepEqual((await response.json()).data, [...(microsoftEnabled ? ['microsoft'] : []), ...(googleEnabled ? ['google'] : [])])
    const html = await fetch(`${origin}/sign-in`).then(response => response.text())
    for (const [provider, enabled] of [['microsoft', microsoftEnabled], ['google', googleEnabled]] as const) {
      assert.equal(html.includes(`href="/api/auth/${provider}"`), enabled, `${provider} button follows the environment flag`)
      assert.equal((await fetch(`${origin}/api/auth/${provider}`, { redirect: 'manual' })).status, 503, 'Disabled or unconfigured login fails explicitly')
      const callback = await fetch(`${origin}/api/auth/${provider}/callback?code=invalid&state=invalid`, { redirect: 'manual' })
      assert.equal(callback.status, 302)
      assert.equal(callback.headers.get('location'), `/sign-in?error=${provider}`)
      assert.equal(callback.headers.get('referrer-policy'), 'no-referrer')
      assert.ok(!callback.headers.get('set-cookie')?.includes('sele_session='), 'Invalid callback never establishes a session')
    }
    if (!microsoftEnabled && !googleEnabled) {
      assert.ok(html.includes('Sign-in is currently disabled'))
    }
    await stop()
  }
  console.log('Authentication integration passed: provider flags/UI/endpoints, Google persistence, invitations, repeat login, identity collision isolation, inactive accounts and invalid callbacks')
} finally {
  await stop()
  await fixture.close()
}
