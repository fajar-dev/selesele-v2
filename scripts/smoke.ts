import { strict as assert } from 'node:assert'

const port = Number(process.env.SMOKE_PORT || 13803)
const origin = `http://127.0.0.1:${port}`
const server = Bun.spawn(['bun', '.output/server/index.mjs'], {
  env: { ...process.env, MAIL_ENABLED: 'false', PORT: String(port), HOST: '127.0.0.1', APP_ORIGIN: origin, NODE_ENV: 'production', AUTH_SECRET: 'smoke-test-secret-32-characters-minimum', MICROSOFT_CLIENT_ID: '', MICROSOFT_CLIENT_SECRET: '', MICROSOFT_TENANT_ID: '' },
  stdout: 'pipe', stderr: 'pipe'
})

try {
  let started = false
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) {
        started = true
        break
      }
    } catch { /* Wait briefly for the Bun listener. */ }
    await Bun.sleep(100)
  }
  assert.ok(started, 'Production server did not start')
  const health = await fetch(`${origin}/api/health`).then(response => response.json())
  assert.equal(health.data.status, 'ok')
  for (const path of ['/api/workspaces', '/api/auth/me', '/api/pages/019a71f3-32c1-7000-8000-000000000001/content']) {
    assert.equal((await fetch(origin + path)).status, 401, path)
  }
  for (const path of ['/api/upload', '/api/completion']) {
    assert.equal((await fetch(origin + path, { method: 'POST' })).status, 401, path)
  }
  const login = await fetch(`${origin}/api/auth/microsoft`, { redirect: 'manual' })
  assert.equal(login.status, 503, 'Missing Microsoft configuration fails explicitly')
  const callback = await fetch(`${origin}/api/auth/microsoft/callback?code=invalid&state=invalid`, { redirect: 'manual' })
  assert.equal(callback.status, 302, 'Unbound OAuth callbacks are rejected')
  assert.equal(callback.headers.get('location'), '/sign-in?error=microsoft')
  assert.equal(callback.headers.get('referrer-policy'), 'no-referrer')
  assert.ok(!callback.headers.get('set-cookie')?.includes('sele_session='), 'Invalid OAuth callback cannot create a session')
  const crossOrigin = await fetch(`${origin}/api/auth/logout`, {
    method: 'POST', headers: { Origin: 'https://untrusted.example' }, body: '{}'
  })
  assert.equal(crossOrigin.status, 403, 'CSRF protection')
  const signIn = await fetch(`${origin}/sign-in`)
  assert.equal(signIn.status, 200)
  assert.ok((await signIn.text()).includes('Continue with Microsoft'), 'Microsoft sign-in page is server-rendered')
  const home = await fetch(origin, { redirect: 'manual' })
  assert.equal(home.status, 302, 'Unauthenticated home redirect')
  const socket = await fetch(`${origin}/collaboration/019a71f3-32c1-7000-8000-000000000001`, {
    headers: { 'Origin': origin, 'Upgrade': 'websocket', 'Connection': 'Upgrade',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' }
  })
  assert.equal(socket.status, 401, 'WebSocket upgrade requires a session')
  console.log('HTTP smoke: health, SSR, authentication, validation, CSRF and WebSocket upgrade passed')
} finally {
  server.kill('SIGTERM')
  await server.exited
}
