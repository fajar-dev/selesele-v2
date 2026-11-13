import type { ItemTemplate } from '../shared/kernel/library'
import type { CanvasSnapshot, KanbanContent } from '../shared/kernel/content'
import { strict as assert } from 'node:assert'
import { randomUUID } from 'node:crypto'
import { createConnection } from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { createDatabase } from '../server/platform/database/client'
import { databaseConfig } from '../server/platform/database/config'
import { AuthService } from '../server/features/identity/application/AuthService'
import { MySqlUserRepository } from '../server/features/identity/infrastructure/MySqlUserRepository'
import { MySqlSessionRepository } from '../server/features/identity/infrastructure/MySqlSessionRepository'
import { CryptographicTokens } from '../server/features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../server/platform/runtime/SystemClock'
import type { ConversationDetail, ConversationSummary } from '../shared/kernel/conversation'
import type { MoveImpact, ResourcePolicy } from '../shared/kernel/access'
import type { ContentItem } from '../shared/contracts/item'
import type { MemberItem } from '../shared/kernel/member'
import type { NotificationItem } from '../shared/kernel/notification'

const databaseName = `sele_features_test_${randomUUID().replaceAll('-', '')}`
const admin = await createConnection({ ...databaseConfig(), database: undefined })
const origin = 'http://127.0.0.1:13813'
let database: ReturnType<typeof createDatabase> | undefined, server: ReturnType<typeof Bun.spawn> | undefined
const accounts: {
  token: string
  userId: string
  email: string
}[] = []
const gateway = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
  const prompt = await request.text()
  assert.ok(!prompt.includes('DO_NOT_LEAK_PRIVATE'))
  const chunk = { id: 'improvements', object: 'chat.completion.chunk', created: 1, model: 'fixture', choices: [{ index: 0, delta: { content: 'The launch is Monday [1].' }, finish_reason: null }] }
  return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify({ ...chunk, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`, { headers: { 'Content-Type': 'text/event-stream' } })
} })
async function request<T>(actor: number, path: string, method = 'GET', body?: unknown, expected = 200): Promise<T> {
  const result = await fetch(`${origin}/api${path}`, { method, headers: { 'Cookie': `sele_session=${accounts[actor]!.token}`, 'Origin': origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  const value = await result.json() as {
    data: T
    message?: string
  }
  assert.equal(result.status, expected, `${method} ${path}: ${value.message || JSON.stringify(value).slice(0, 300)}`)
  return value.data
}
try {
  await admin.query(`CREATE DATABASE \`${databaseName}\``)
  await admin.changeUser({ database: databaseName })
  await migrate(drizzle(admin), { migrationsFolder: './drizzle' })
  process.env.DB_NAME = databaseName
  database = createDatabase()
  const auth = new AuthService(new MySqlUserRepository(database.db), new MySqlSessionRepository(database.db), new CryptographicTokens(), new SystemClock())
  for (const name of ['Owner', 'Member', 'Outsider', 'Viewer']) {
    const email = `${name}-${randomUUID()}@example.invalid`
    const account = await auth.login({ subject: `${randomUUID()}:${randomUUID()}`, email, name }, null)
    accounts.push({ token: account.token, userId: account.user.id, email })
  }
  assert.ok(!await fetch(`${origin}/api/health`).then(() => true, () => false), 'Integration port occupied')
  server = Bun.spawn(['bun', '.output/server/index.mjs'], { env: { ...process.env, DB_NAME: databaseName, MAIL_ENABLED: 'false', APP_ORIGIN: origin, HOST: '127.0.0.1', PORT: '13813', NODE_ENV: 'production', AI_BASE_URL: `http://127.0.0.1:${gateway.port}/v1`, AI_API_KEY: 'fixture', AI_MODEL: 'fixture' }, stdout: 'inherit', stderr: 'inherit' })
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await fetch(`${origin}/api/health`).then(response => response.ok, () => false)) {
      ready = true
      break
    }
    assert.equal(server.exitCode, null)
    await Bun.sleep(100)
  }
  assert.ok(ready)
  const workspace = await request<{
    id: string
  }>(0, '/workspaces', 'POST', { name: 'Improvements' }, 201)
  const base = `/workspaces/${workspace.id}`
  for (const actor of [1, 3]) {
    await request(0, `${base}/members`, 'POST', { emails: [accounts[actor]!.email], role: actor === 3 ? 'viewer' : 'member' }, 201)
  }
  const catalog = await request<ItemTemplate[]>(1, '/templates')
  for (const template of catalog.filter(template => template.kind !== 'document')) {
    const seeded = await request<ContentItem>(1, `${base}/templates`, 'POST', { templateId: template.id })
    assert.equal(seeded.kind, template.kind)
    assert.equal(seeded.title, template.title)
    const snapshot = await request<CanvasSnapshot>(1, `/items/${seeded.id}/canvas`)
    assert.deepEqual(snapshot.content, JSON.parse(template.content))
  }
  const members = await request<MemberItem[]>(0, `${base}/members`)
  const member = members.find(item => item.userId === accounts[1]!.userId)!
  const item = await request<ContentItem>(0, `${base}/items`, 'POST', { title: 'Launch plan' }, 201)
  const itemPath = `/items/${item.id}`
  await request(0, `${itemPath}/content`, 'POST', { content: '# Launch plan\n\nThe launch is Monday.' })
  const conversation = await request<ConversationSummary>(1, `${base}/conversations`, 'POST')
  await request(0, `${base}/conversations/${conversation.id}`, 'GET', undefined, 404)
  await request(2, `${base}/conversations`, 'GET', undefined, 404)
  let chat = await request<ConversationDetail>(1, `${base}/conversations/${conversation.id}/messages`, 'POST', { question: 'When is the launch?', revision: 0 })
  assert.equal(chat.messages.length, 2)
  assert.ok(chat.messages[1]!.sources.some(source => source.id === item.id))
  chat = await request<ConversationDetail>(1, `${base}/conversations/${conversation.id}/messages`, 'POST', { question: 'What is the launch day?', revision: chat.revision })
  assert.equal(chat.messages.length, 4)
  await request(1, `${base}/conversations/${conversation.id}/messages`, 'POST', { question: 'When is launch?', revision: 0 }, 409)
  await request(1, `${base}/conversations/${conversation.id}`, 'PATCH', { title: 'Launch discussion' })
  assert.equal((await request<ConversationDetail>(1, `${base}/conversations/${conversation.id}`)).title, 'Launch discussion')
  await request(0, `${itemPath}/access`, 'PUT', { mode: 'restricted', grants: [] })
  chat = await request<ConversationDetail>(1, `${base}/conversations/${conversation.id}`)
  assert.ok(chat.messages.filter(message => message.role === 'assistant').every(message => message.unavailable && !message.sources.length && !message.content.includes('Monday')))
  await request(0, `${itemPath}/access`, 'PUT', { mode: 'inherit', grants: [] })
  const folder = await request<{
    id: string
  }>(0, `${base}/folders`, 'POST', { name: 'Finance' }, 201)
  await request(0, `${base}/folders/${folder.id}/access`, 'PUT', { mode: 'restricted', grants: [] })
  const preview = await request<MoveImpact>(0, `${itemPath}/location/preview`, 'POST', { folderId: folder.id })
  assert.ok(preview.changes.some(change => change.memberId === member.id && change.after === 'none'))
  await request(0, `${itemPath}/location`, 'PATCH', { folderId: folder.id }, 409)
  await request(0, `${base}/folders/${folder.id}/access`, 'PUT', { mode: 'restricted', grants: [{ memberId: member.id, groupId: null, level: 'view', expiresAt: null }] })
  await request(0, `${itemPath}/location`, 'PATCH', { folderId: folder.id, acknowledgement: preview.token }, 409)
  const reviewed = await request<MoveImpact>(0, `${itemPath}/location/preview`, 'POST', { folderId: folder.id })
  await request(0, `${itemPath}/location`, 'PATCH', { folderId: folder.id, acknowledgement: reviewed.token })
  assert.equal((await request<ContentItem>(1, itemPath)).accessLevel, 'view')
  const outward = await request<MoveImpact>(0, `${itemPath}/location/preview`, 'POST', { folderId: null })
  await request(0, `${itemPath}/location`, 'PATCH', { folderId: null, acknowledgement: outward.token })
  const template = await request<{
    id: string
  }>(0, `${base}/templates/save`, 'POST', { itemId: item.id, title: 'Launch template', description: 'Reusable plan' })
  await request(1, `${base}/templates/save`, 'POST', { itemId: item.id, title: 'Unauthorized' }, 403)
  await request(0, `${itemPath}/content`, 'POST', { content: '# Changed after saving template' })
  const copy = await request<ContentItem>(1, `${base}/templates`, 'POST', { templateId: template.id }, 200)
  assert.ok((await request<{
    content: string
  }>(1, `/items/${copy.id}/content`)).content.includes('Monday'))
  await request(0, `${itemPath}/access`, 'PUT', { mode: 'restricted', grants: [] })
  assert.ok(!(await request<{
    id: string
  }[]>(1, `${base}/templates`)).some(item => item.id === template.id))
  await request(1, `${base}/templates`, 'POST', { templateId: template.id }, 404)
  await request(0, `${itemPath}/access`, 'PUT', { mode: 'inherit', grants: [] })
  await request(0, `${itemPath}/archive`, 'POST', { archived: true })
  assert.ok((await request<ContentItem>(0, itemPath)).archivedAt)
  await request(0, `${itemPath}/content`, 'POST', { content: 'Blocked' }, 403)
  await request(0, itemPath, 'PUT', { title: 'Blocked' }, 403)
  assert.equal((await request<{
    id: string
  }[]>(0, `/library/search?q=Launch&workspaceId=${workspace.id}`)).some(entry => entry.id === item.id), false)
  await request(0, `${itemPath}/archive`, 'POST', { archived: false })
  // All item types share membership, lifecycle, history, search and template rules.
  const board = await request<ContentItem>(0, `${base}/items`, 'POST', { title: 'Release board', kind: 'kanban', icon: '📋' }, 201)
  const canvasPath = `/items/${board.id}/canvas`
  const initial = await request<CanvasSnapshot>(1, canvasPath)
  assert.equal(initial.content.kind, 'kanban')
  await request(2, canvasPath, 'GET', undefined, 404)
  await request(3, canvasPath, 'PUT', { content: initial.content, revision: 0 }, 403)
  await request(0, `${itemPath}/canvas`, 'GET', undefined, 400)
  await request(0, `/items/${board.id}/content`, 'POST', { content: 'Invalid editor' }, 400)
  await request(0, `/items/${board.id}/state`, 'GET', undefined, 400)
  await request(0, `/items/${board.id}`, 'PUT', { kind: 'diagram' }, 400)
  const content = initial.content as KanbanContent
  content.tasks.push({ id: randomUUID(), number: 1, title: 'CanvasLaunchReview', description: 'Prepare the launch checklist', columnId: content.columns[0]!.id, priority: 'high', assigneeId: member.id, dueDate: '2026-12-01', labels: ['Launch'], checklist: [{ id: randomUUID(), title: 'Review assets', done: false }], createdAt: new Date().toISOString() })
  content.nextNumber = 2
  const saved = await request<CanvasSnapshot>(1, canvasPath, 'PUT', { content, revision: 0 })
  assert.equal(saved.revision, 1)
  assert.equal((saved.content as KanbanContent).tasks[0]!.assigneeId, member.id)
  await request(0, canvasPath, 'PUT', { content, revision: 0 }, 409)
  await request(0, canvasPath, 'PUT', { content: { ...content, tasks: [{ ...content.tasks[0], columnId: randomUUID() }] }, revision: 1 }, 400)
  await request(0, canvasPath, 'PUT', { content: { ...content, tasks: [{ ...content.tasks[0], assigneeId: randomUUID() }] }, revision: 1 }, 400)
  assert.ok((await request<{
    id: string
  }[]>(1, `/library/search?q=CanvasLaunchReview&workspaceId=${workspace.id}`)).some(entry => entry.id === board.id))
  const boardTemplate = await request<{
    id: string
  }>(0, `${base}/templates/save`, 'POST', { itemId: board.id, title: 'Release board template' })
  const boardCopy = await request<ContentItem>(1, `${base}/templates`, 'POST', { templateId: boardTemplate.id })
  assert.equal(boardCopy.kind, 'kanban')
  assert.equal(((await request<CanvasSnapshot>(1, `/items/${boardCopy.id}/canvas`)).content as KanbanContent).tasks.length, 1)
  const versions = await request<{
    id: string
  }[]>(0, `/items/${board.id}/versions`)
  assert.ok(versions.length)
  await request(0, `/items/${board.id}/versions/${versions[0]!.id}/restore`, 'POST')
  assert.equal(((await request<CanvasSnapshot>(1, canvasPath)).content as KanbanContent).tasks.length, 0)
  await request(0, `/items/${board.id}/access`, 'PUT', { mode: 'restricted', grants: [] })
  await request(1, canvasPath, 'GET', undefined, 404)
  assert.ok(!(await request<{
    id: string
  }[]>(1, `/library/search?q=CanvasLaunchReview&workspaceId=${workspace.id}`)).some(entry => entry.id === board.id))
  await request(0, `/items/${board.id}/access`, 'PUT', { mode: 'inherit', grants: [] })
  for (const kind of ['whiteboard', 'diagram'] as const) {
    const item = await request<ContentItem>(0, `${base}/items`, 'POST', { title: `Design ${kind}`, kind }, 201)
    const path = `/items/${item.id}/canvas`
    const state = await request<CanvasSnapshot>(1, path)
    assert.equal(state.content.kind, kind)
    if (state.content.kind === 'whiteboard') {
      state.content.elements.push({ id: randomUUID(), type: 'pen', x: 10, y: 20, width: 80, height: 40, points: [[0, 0, 0.5], [40, 10, 0.7], [80, 40, 0.5]], text: '', color: '#2563eb', size: 4 })
      state.content.elements.push({ id: randomUUID(), type: 'sticky', x: 100, y: 100, width: 200, height: 140, points: [], text: 'CanvasIdeasReview', color: '#d97706', size: 2 })
    } else if (state.content.kind === 'diagram') {
      const node = (label: string, x: number) => ({ id: randomUUID(), type: 'shape' as const, position: { x, y: 10 }, data: { label, shape: 'rectangle' as const, color: '#18181b', width: 180, height: 90 } })
      state.content.nodes.push(node('CanvasFlowReview', 0), node('Done', 300))
      state.content.edges.push({ id: randomUUID(), source: state.content.nodes[0]!.id, target: state.content.nodes[1]!.id, sourceHandle: 'right', targetHandle: 'left', label: 'Approved', type: 'smoothstep' })
    }
    const updated = await request<CanvasSnapshot>(1, path, 'PUT', { content: state.content, revision: 0 })
    assert.deepEqual(updated.content, state.content)
    await request(1, path, 'PUT', { content: { kind: 'kanban', columns: [], tasks: [], nextNumber: 1 }, revision: 1 }, 400)
    if (updated.content.kind === 'diagram') {
      await request(1, path, 'PUT', { content: { ...updated.content, edges: [{ ...updated.content.edges[0], target: randomUUID() }] }, revision: 1 }, 400)
    }
    await request(0, `/items/${item.id}/archive`, 'POST', { archived: true })
    await request(1, path, 'PUT', { content: updated.content, revision: 1 }, 403)
    await request(0, `/items/${item.id}/archive`, 'POST', { archived: false })
    await request(0, `/items/${item.id}`, 'DELETE')
    await request(0, path, 'GET', undefined, 404)
    await request(0, `/trash/item/${item.id}/restore`, 'POST')
    assert.equal((await request<CanvasSnapshot>(1, path)).content.kind, kind)
  }
  const exportResponse = await fetch(`${origin}/api${base}/export`, { headers: { Cookie: `sele_session=${accounts[0]!.token}` } })
  assert.equal(exportResponse.status, 200)
  const exported = await new Bun.Archive(await exportResponse.arrayBuffer()).files()
  assert.ok([...exported.keys()].some(name => name.endsWith(`${board.id}.json`)))
  assert.ok([...exported.keys()].some(name => name.endsWith(`${item.id}.md`)))
  const thread = await request<{
    id: string
  }>(1, `${itemPath}/comments`, 'POST', { quote: 'Changed', anchor: { from: { tname: 'default', assoc: 0 }, to: { tname: 'default', assoc: 1 } }, body: `Please review @${accounts[0]!.email}` }, 201)
  assert.ok((await request<NotificationItem[]>(0, '/notifications')).some(item => item.threadId === thread.id))
  const previewAccess = await request<{
    level: string
    id: string
  }[]>(0, `${base}/members/${member.id}/access`)
  assert.ok(previewAccess.some(entry => entry.id === item.id && entry.level === 'edit'))
  const policy = await request<ResourcePolicy>(0, `${itemPath}/access`)
  assert.equal(policy.mode, 'inherit')
  await request(1, `${base}/conversations/${conversation.id}`, 'DELETE')
  await request(1, `${base}/conversations/${conversation.id}`, 'GET', undefined, 404)
  console.log('Improvements integration passed: private AI history and source revocation, move acknowledgement and stale-policy rejection, template snapshots, item archive, typed kanban/whiteboard/diagram persistence, revisions, templates, export, ACL and discussion deep links')
} finally {
  if (server) {
    server.kill('SIGTERM')
    const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000)
    await server.exited
    clearTimeout(timeout)
  }
  gateway.stop(true)
  await database?.close()
  await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``)
  await admin.end()
}
