import { strict as assert } from 'node:assert'

const port = Number(process.env.SMOKE_PORT || 13803)
const origin = `http://127.0.0.1:${port}`
const server = Bun.spawn(['bun', '.output/server/index.mjs'], {
  env: { ...process.env, MAIL_ENABLED: 'false', PORT: String(port), HOST: '127.0.0.1', APP_ORIGIN: origin, NODE_ENV: 'production', AUTH_SECRET: 'smoke-test-secret-32-characters-minimum', MICROSOFT_ENABLED: 'true', GOOGLE_ENABLED: 'false', MICROSOFT_CLIENT_ID: '', MICROSOFT_CLIENT_SECRET: '', MICROSOFT_TENANT_ID: '' },
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
    } catch { /* Feedback is owned by the caller; preserve the current draft or retry state. */ }
    await Bun.sleep(100)
  }
  assert.ok(started, 'Production server did not start')
  const health = await fetch(`${origin}/api/health`).then(response => response.json())
  assert.equal(health.data.status, 'ok')
  for (const path of ['/api/workspaces', '/api/auth/me', '/api/items/019a71f3-32c1-7000-8000-000000000001/content']) {
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
  const signIn = await fetch(`${origin}/sign-in?error=microsoft`)
  assert.equal(signIn.status, 200)
  const markup = await signIn.text()
  assert.ok(markup.includes('Continue with Microsoft'), 'Microsoft sign-in item is server-rendered')
  const html = markup.split('</head>', 1)[0]!
  assert.ok(html.includes('<title>SeleSele — A workspace for your team</title>'))
  assert.ok(html.includes(`rel="canonical" href="${origin}/sign-in"`), 'Canonical uses the configured origin without the query')
  assert.ok(html.includes(`property="og:image" content="${origin}/branding/social-card.png"`))
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'))
  assert.ok(html.includes('rel="manifest" href="/manifest.webmanifest"'))
  assert.ok(!html.includes('content="noindex"'), 'Public sign-in is indexable')
  assert.ok((await fetch(`${origin}/branding/social-card.png`)).headers.get('content-type')?.startsWith('image/png'))

  const manifestResponse = await fetch(`${origin}/manifest.webmanifest`)
  assert.equal(manifestResponse.status, 200)
  assert.match(manifestResponse.headers.get('content-type') || '', /^application\/manifest\+json/)
  const manifest = await manifestResponse.json() as { id: string, scope: string, start_url: string, icons: { src: string, purpose: string, sizes: string }[] }
  assert.equal(manifest.id, '/')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.start_url, '/')
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'))
  for (const icon of manifest.icons) {
    const asset = await fetch(origin + icon.src)
    assert.equal(asset.status, 200)
    const png = new DataView(await asset.arrayBuffer())
    assert.equal(`${png.getUint32(16)}x${png.getUint32(20)}`, icon.sizes)
  }
  assert.equal((await fetch(`${origin}/robots.txt`)).status, 200)

  for (const path of ['/', '/tasks', '/trash', '/workspaces/private/items/private']) {
    const response = await fetch(origin + path, { redirect: 'manual' })
    assert.equal(response.status, 302, path)
    assert.equal(response.headers.get('x-robots-tag'), 'noindex', path)
  }
  const socket = await fetch(`${origin}/collaboration/019a71f3-32c1-7000-8000-000000000001`, {
    headers: { 'Origin': origin, 'Upgrade': 'websocket', 'Connection': 'Upgrade',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' }
  })
  assert.equal(socket.status, 401, 'WebSocket upgrade requires a session')
  console.log('HTTP smoke: metadata, manifest, SSR, authentication, validation, CSRF and WebSocket upgrade passed')
} finally {
  server.kill('SIGTERM')
  await server.exited
}
