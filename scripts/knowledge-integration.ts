import { strict as assert } from 'node:assert'

const port = Number(process.env.KNOWLEDGE_PORT || 13810)
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536, 'Invalid integration port')
const origin = `http://127.0.0.1:${port}`
const occupied = await fetch(`${origin}/api/health`).then(() => true, () => false)
assert.ok(!occupied, `Integration port ${port} is already in use`)
const gateway = Bun.serve({
  hostname: '127.0.0.1', port: 0,
  async fetch(request) {
    const body = await request.text()
    assert.ok(!body.includes('DO_NOT_LEAK_PRIVATE'), 'Gateway never receives inaccessible documents')
    if (body.includes('simulate gateway failure')) {
      return Response.json({ error: { message: 'Simulated unavailable gateway' } }, { status: 503 })
    }
    const chunk = { id: 'knowledge-test', object: 'chat.completion.chunk', created: 1, model: 'knowledge-test', choices: [{ index: 0, delta: { content: 'The project launch is Monday [1].' }, finish_reason: null }] }
    return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify({ ...chunk, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`, { headers: { 'Content-Type': 'text/event-stream' } })
  }
})
const server = Bun.spawn(['bun', '.output/server/index.mjs'], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', APP_ORIGIN: origin, NODE_ENV: 'production', AI_BASE_URL: `http://127.0.0.1:${gateway.port}/v1`, AI_API_KEY: 'integration-test', AI_MODEL: 'knowledge-test' },
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
  const checks = Bun.spawn(['bun', 'scripts/knowledge-smoke.ts'], {
    env: { ...process.env, SMOKE_ORIGIN: origin }, stdout: 'inherit', stderr: 'inherit'
  })
  assert.equal(await checks.exited, 0, 'Workspace integration checks failed')
} finally {
  await gateway.stop(true)
  server.kill('SIGTERM')
  const timeout = setTimeout(() => server.kill('SIGKILL'), 5000)
  try {
    await server.exited
  } finally {
    clearTimeout(timeout)
  }
}
