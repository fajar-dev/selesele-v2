import { strict as assert } from 'node:assert'

const port = Number(process.env.INTEGRATION_PORT || 13808)
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536, 'Invalid integration port')
const origin = `http://127.0.0.1:${port}`
const occupied = await fetch(`${origin}/api/health`).then(() => true, () => false)
assert.ok(!occupied, `Integration port ${port} is already in use`)
const server = Bun.spawn(['bun', '.output/server/index.mjs'], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', APP_ORIGIN: origin, NODE_ENV: 'production' },
  stdout: 'inherit', stderr: 'inherit'
})
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) {
      throw new Error('Production server exited before becoming ready')
    }
    try {
      if ((await fetch(`${origin}/api/health`)).ok) {
        ready = true
        break
      }
    } catch { /* Wait for the owned listener. */ }
    await Bun.sleep(100)
  }
  assert.ok(ready, 'Production server did not become ready')
  const checks = Bun.spawn(['bun', 'scripts/workspace-smoke.ts'], {
    env: { ...process.env, SMOKE_ORIGIN: origin }, stdout: 'inherit', stderr: 'inherit'
  })
  assert.equal(await checks.exited, 0, 'Workspace integration checks failed')
} finally {
  server.kill('SIGTERM')
  const timeout = setTimeout(() => server.kill('SIGKILL'), 5000)
  try {
    await server.exited
  } finally {
    clearTimeout(timeout)
  }
}
