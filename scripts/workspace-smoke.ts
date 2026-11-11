import { randomUUID } from 'node:crypto'
import { strict as assert } from 'node:assert'
import { eq, inArray } from 'drizzle-orm'
import { createDatabase } from '../server/infrastructure/database/client'
import { documents, folders, pages, sessions, users, workspaceInvitations, workspaceMembers, workspaces } from '../server/infrastructure/database/schema'
import { MySqlUserRepository } from '../server/infrastructure/database/repositories/MySqlUserRepository'
import { MySqlSessionRepository } from '../server/infrastructure/database/repositories/MySqlSessionRepository'
import { AuthService } from '../server/application/AuthService'

const origin = new URL(process.env.SMOKE_ORIGIN || 'http://localhost:3000')
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Integration smoke requires a local server')
const database = createDatabase()
const auth = new AuthService(new MySqlUserRepository(database.db), new MySqlSessionRepository(database.db))
const accounts: { userId: string, token: string, email: string }[] = []
const workspaceIds: string[] = []
let socket: WebSocket | undefined

async function request<T>(actor: number, path: string, method = 'GET', body?: unknown, expected = 200): Promise<T> {
  const response = await fetch(new URL(`/api${path}`, origin), {
    method,
    headers: { 'Cookie': `sele_session=${accounts[actor]!.token}`, 'Origin': origin.origin, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual'
  })
  assert.equal(response.status, expected, `${method} ${path}`)
  const payload = await response.json() as { data: T }
  return payload.data
}

try {
  for (const label of ['owner', 'member', 'outsider']) {
    const email = `workspace-smoke-${label}-${randomUUID()}@example.invalid`
    const result = await auth.login({ subject: `${randomUUID()}:${randomUUID()}`, email, name: `Smoke ${label}` }, null)
    accounts.push({ userId: result.user.id, token: result.token, email })
  }
  const headers = { Cookie: `sele_session=${accounts[0]!.token}` }
  const home = await fetch(origin, { headers, redirect: 'manual' })
  assert.equal(home.status, 200)
  assert.ok((await home.text()).includes('Your workspaces'), 'Authenticated home renders')
  const signIn = await fetch(new URL('/sign-in', origin), { headers, redirect: 'manual' })
  assert.equal(signIn.status, 302)
  assert.equal(signIn.headers.get('location'), '/')

  const workspace = await request<{ id: string }>(0, '/workspaces', 'POST', { name: 'Smoke workspace' }, 201)
  workspaceIds.push(workspace.id)
  const second = await request<{ id: string }>(0, '/workspaces', 'POST', { name: 'Isolated workspace' }, 201)
  workspaceIds.push(second.id)
  const path = `/workspaces/${workspace.id}`
  const folder = await request<{ id: string }>(0, `${path}/folders`, 'POST', { name: 'Projects' }, 201)
  const foreignFolder = await request<{ id: string }>(0, `/workspaces/${second.id}/folders`, 'POST', { name: 'Private' }, 201)
  const page = await request<{ id: string }>(0, `${path}/pages`, 'POST', { title: 'Project notes', folderId: folder.id }, 201)
  const pagePath = `/pages/${page.id}`
  await request(2, path, 'GET', undefined, 404)
  await request(2, pagePath, 'GET', undefined, 404)
  await request(2, `${path}/folders`, 'POST', { name: 'Injected' }, 404)
  await request(0, `${pagePath}/location`, 'PATCH', { folderId: foreignFolder.id }, 404)
  await request(0, `${path}/pages`, 'POST', { title: 'Injected', folderId: foreignFolder.id }, 404)
  await request(0, `${pagePath}/location`, 'PATCH', { folderId: null })
  await request(0, `${pagePath}/location`, 'PATCH', { folderId: folder.id })

  await request(0, `${path}/invitations`, 'POST', { email: accounts[1]!.email, role: 'member' }, 201)
  const inbox = await request<{ id: string }[]>(1, '/invitations')
  assert.equal(inbox.length, 1)
  await request(2, `/invitations/${inbox[0]!.id}/accept`, 'POST', undefined, 404)
  await request(1, path, 'GET', undefined, 404)
  await request(1, `/invitations/${inbox[0]!.id}/accept`, 'POST')
  await request(1, `/invitations/${inbox[0]!.id}/accept`, 'POST', undefined, 404)
  await request(1, `${path}/invitations`, 'POST', { email: accounts[2]!.email }, 403)
  await request(0, `${path}/invitations`, 'POST', { email: accounts[2]!.email }, 201)
  let otherInvites = await request<{ id: string }[]>(2, '/invitations')
  await database.db.update(workspaceInvitations).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(workspaceInvitations.id, otherInvites[0]!.id))
  assert.equal((await request<unknown[]>(2, '/invitations')).length, 0, 'Expired invitations are hidden')
  await request(2, `/invitations/${otherInvites[0]!.id}/accept`, 'POST', undefined, 404)
  await request(0, `${path}/invitations`, 'POST', { email: accounts[2]!.email }, 201)
  otherInvites = await request<{ id: string }[]>(2, '/invitations')
  await request(0, `${path}/invitations/${otherInvites[0]!.id}`, 'DELETE')
  await request(2, `/invitations/${otherInvites[0]!.id}/accept`, 'POST', undefined, 404)
  await request(0, `${path}/invitations`, 'POST', { email: accounts[2]!.email }, 201)
  otherInvites = await request<{ id: string }[]>(2, '/invitations')
  await request(2, `/invitations/${otherInvites[0]!.id}`, 'DELETE')
  assert.equal((await request<unknown[]>(2, '/invitations')).length, 0, 'Declined invitations are removed')
  await request(0, `${path}/members/${accounts[1]!.userId}`, 'PATCH', { role: 'admin' })
  await request(1, path, 'PATCH', { name: 'Renamed workspace' })
  await request(1, path, 'DELETE', undefined, 403)
  await request(0, `${path}/members/${accounts[1]!.userId}`, 'PATCH', { role: 'member' })
  await request(1, `${path}/folders/${folder.id}`, 'PATCH', { name: 'Renamed folder' })
  await request(0, `${path}/members/${accounts[0]!.userId}`, 'DELETE', undefined, 409)
  await request(0, `${path}/members/${accounts[0]!.userId}`, 'PATCH', { role: 'member' }, 409)
  await request(1, pagePath, 'PUT', { title: 'Shared workspace notes' })
  await request(1, `${pagePath}/content`, 'POST', { content: '# Shared notes\n\nPersisted by a workspace member.' })
  const content = await request<{ content: string }>(0, `${pagePath}/content`)
  assert.ok(content.content.includes('Persisted by a workspace member'))
  const overview = await request<{ members: unknown[], pages: { folderId: string | null }[] }>(1, path)
  assert.equal(overview.members.length, 2)
  assert.equal(overview.pages[0]!.folderId, folder.id)
  for (const route of [path, `${path}/pages/${page.id}`]) {
    const response = await fetch(new URL(route, origin), { headers: { ...headers, Accept: 'application/json' }, redirect: 'manual' })
    if (response.status !== 200) {
      console.error((await response.clone().text()).slice(0, 1500))
    }
    assert.equal(response.status, 200, `SSR ${route}`)
    assert.ok(!(await response.text()).includes('Server Error'), `SSR renders ${route}`)
  }

  const socketUrl = new URL(`/collaboration/${page.id}`, origin)
  socketUrl.protocol = origin.protocol === 'https:' ? 'wss:' : 'ws:'
  socket = new WebSocket(socketUrl, { headers: { Cookie: `sele_session=${accounts[1]!.token}`, Origin: origin.origin } })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket open timeout')), 10000)
    socket!.addEventListener('open', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
    socket!.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error('Workspace member cannot open collaboration'))
    }, { once: true })
  })
  const closed = new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Revocation did not close the WebSocket')), 10000)
    socket!.addEventListener('close', (event) => {
      clearTimeout(timer)
      resolve(event.code)
    }, { once: true })
  })
  await request(0, `${path}/members/${accounts[1]!.userId}`, 'DELETE')
  assert.equal(await closed, 1008)
  await request(1, pagePath, 'GET', undefined, 404)
  await request(1, `${pagePath}/content`, 'POST', { content: 'Revoked edit' }, 404)
  await request(0, `${path}/folders/${folder.id}`, 'DELETE')
  const relocated = await request<{ folderId: string | null }>(0, pagePath)
  assert.equal(relocated.folderId, null, 'Deleting a folder preserves pages at the root')
  await request(0, path, 'DELETE')
  await request(0, pagePath, 'GET', undefined, 404)
  await auth.logout(accounts[0]!.token)
  await request(0, '/auth/me', 'GET', undefined, 401)
  console.log('Workspace integration passed: MySQL, SSR, workspace isolation, folders, page moves, invitations, roles, content, live WebSocket revocation and logout')
} finally {
  socket?.close()
  if (workspaceIds.length) {
    const pageRows = await database.db.select({ id: pages.id }).from(pages).where(inArray(pages.workspaceId, workspaceIds))
    if (pageRows.length) {
      await database.db.delete(documents).where(inArray(documents.pageId, pageRows.map(page => page.id)))
    }
    await database.db.delete(pages).where(inArray(pages.workspaceId, workspaceIds))
    await database.db.delete(folders).where(inArray(folders.workspaceId, workspaceIds))
    await database.db.delete(workspaceInvitations).where(inArray(workspaceInvitations.workspaceId, workspaceIds))
    await database.db.delete(workspaceMembers).where(inArray(workspaceMembers.workspaceId, workspaceIds))
    await database.db.delete(workspaces).where(inArray(workspaces.id, workspaceIds))
  }
  for (const account of accounts) {
    await database.db.delete(sessions).where(eq(sessions.userId, account.userId))
    await database.db.delete(users).where(eq(users.id, account.userId))
  }
  await database.close()
}
