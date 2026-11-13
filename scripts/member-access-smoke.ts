import { strict as assert } from 'node:assert'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { createDatabase } from '../server/platform/database/client'
import { documents, folders, pages, sessions, users, workspaceMembers, workspaces, resourceGrants } from '../server/platform/database/schema'
import { AuthService } from '../server/features/identity/application/AuthService'
import { MySqlUserRepository } from '../server/features/identity/infrastructure/MySqlUserRepository'
import { MySqlSessionRepository } from '../server/features/identity/infrastructure/MySqlSessionRepository'
import { CryptographicTokens } from '../server/features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../server/platform/runtime/SystemClock'
import { MySqlEmailOutbox } from '../server/features/mail/infrastructure/MySqlEmailOutbox'
import type { MemberItem, MemberGroup, MemberAddResult } from '../shared/contracts/member'
import type { EmailDelivery } from '../server/features/mail/domain/EmailDelivery'

const origin = new URL(process.env.SMOKE_ORIGIN || 'http://localhost:3000')
assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname))
const database = createDatabase(), db = database.db
const auth = new AuthService(new MySqlUserRepository(db), new MySqlSessionRepository(db), new CryptographicTokens(), new SystemClock())
const accounts: {
  userId: string
  token: string
  email: string
}[] = []
let workspaceId = ''
let imageFilename = ''
async function createAccount(email: string) {
  const session = await auth.login({ subject: `${randomUUID()}:${randomUUID()}`, email, name: 'Access tester' }, null)
  return { userId: session.user.id, token: session.token, email }
}
async function login(email: string) {
  accounts.push(await createAccount(email))
}
async function request<T = unknown>(actor: number, path: string, method = 'GET', body?: unknown, status = 200): Promise<T> {
  const response = await fetch(new URL(`/api${path}`, origin), { signal: AbortSignal.timeout(15000), method, headers: { 'Cookie': `sele_session=${accounts[actor]!.token}`, 'Origin': origin.origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const payload = await response.json() as {
    data: T
    message?: string
  }
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(payload)}`)
  return payload.data
}
try {
  accounts.push(...await Promise.all(['owner', 'admin', 'member', 'viewer', 'outsider'].map(label => createAccount(`access-${label}-${randomUUID()}@example.invalid`))))
  const ws = await request<{
    id: string
  }>(0, '/workspaces', 'POST', { name: 'Permission audit' }, 201)
  workspaceId = ws.id
  const base = `/workspaces/${workspaceId}`
  for (const [actor, role] of [[1, 'admin'], [2, 'member'], [3, 'viewer']] as const) {
    await request(0, `${base}/members`, 'POST', { emails: [accounts[actor]!.email], role }, 201)
  }
  let roster = await request<MemberItem[]>(0, `${base}/members`)
  const member = (actor: number) => roster.find(item => item.userId === accounts[actor]!.userId)!
  assert.equal(roster.length, 4, 'Membership is immediate')
  const guestEmail = `access-guest-${randomUUID()}@example.invalid`
  await request(0, `${base}/members`, 'POST', { emails: [guestEmail] }, 201)
  const unknown = (await request<MemberItem[]>(0, `${base}/members`)).find(item => item.email === guestEmail)!
  assert.equal(unknown.userId, null)
  await login(guestEmail)
  await request(5, base)
  assert.equal((await request<MemberItem[]>(0, `${base}/members`)).find(item => item.email === guestEmail)!.userId, accounts[5]!.userId, 'Matching Microsoft login attaches email membership')
  await request(1, `${base}/members/${member(0).id}`, 'PATCH', { role: 'member' }, 403)
  await request(1, `${base}/members/${member(1).id}`, 'PATCH', { suspended: true }, 403)
  await request(1, `${base}/members/${member(2).id}`, 'PATCH', { role: 'admin' }, 403)
  await request(2, `${base}/members/${member(3).id}`, 'DELETE', undefined, 403)
  const existing = await request<MemberAddResult[]>(0, `${base}/members`, 'POST', { emails: [accounts[2]!.email, accounts[2]!.email] }, 201)
  assert.equal(existing.length, 1)
  assert.equal(existing[0]!.status, 'exists')
  const folder = await request<{
    id: string
  }>(0, `${base}/folders`, 'POST', { name: 'Confidential' }, 201)
  const page = await request<{
    id: string
  }>(0, `${base}/pages`, 'POST', { title: 'Private launch', folderId: folder.id }, 201)
  const pagePath = `/pages/${page.id}`, folderPolicy = `${base}/folders/${folder.id}/access`
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWoYAAAAASUVORK5CYII=', 'base64')
  const form = new FormData()
  form.append('pageId', page.id)
  form.append('file', new Blob([png], { type: 'image/png' }), 'test.png')
  const upload = await fetch(new URL('/api/upload', origin), { method: 'POST', headers: { Cookie: `sele_session=${accounts[0]!.token}`, Origin: origin.origin }, body: form })
  assert.equal(upload.status, 200)
  const image = await upload.json() as {
    pathname: string
    url: string
  }
  imageFilename = image.pathname
  const imageRead = (actor: number) => fetch(new URL(image.url, origin), { headers: { Cookie: `sele_session=${accounts[actor]!.token}` } })
  assert.equal((await imageRead(0)).status, 200)
  assert.equal((await imageRead(2)).status, 200, 'Image follows the source document permissions')
  await request(0, `${pagePath}/content`, 'POST', { content: `# SECRET_PERMISSION_TOKEN\n\nLaunch is Monday.\n\n![Test](${image.url})` })
  assert.equal((await imageRead(2)).status, 200)
  const anonymousImage = await fetch(new URL(image.url, origin), { redirect: 'manual' })
  assert.ok([401, 302].includes(anonymousImage.status), 'Anonymous image requests are denied or redirected to sign-in')
  assert.ok(!anonymousImage.headers.get('content-type')?.startsWith('image/'), 'Anonymous responses never include image content')
  await request(3, pagePath)
  await request(3, pagePath, 'PUT', { title: 'Illegal edit' }, 403)
  await request(3, `${base}/pages`, 'POST', { title: 'Illegal creation' }, 403)
  await request(2, folderPolicy, 'PUT', { mode: 'restricted', grants: [] }, 403)
  await request(0, folderPolicy, 'PUT', { mode: 'restricted', grants: [] })
  for (const actor of [1, 2, 3, 5]) {
    await request(actor, pagePath, 'GET', undefined, 404)
    await request(actor, `${pagePath}/content`, 'GET', undefined, 404)
    await request(actor, `${pagePath}/md`, 'GET', undefined, 404)
    assert.equal((await request<{
      id: string
    }[]>(actor, `${base}/pages`)).length, 0)
    assert.equal((await request<{
      id: string
    }[]>(actor, '/library/search?q=SECRET_PERMISSION_TOKEN')).length, 0)
  }
  assert.equal((await imageRead(2)).status, 404, 'Restricted attachments cannot be fetched by URL')
  const publicPage = await request<{
    id: string
  }>(2, `${base}/pages`, 'POST', { title: 'Image URL copy attempt' }, 201)
  await request(2, `/pages/${publicPage.id}/content`, 'POST', { content: `![Copied private URL](${image.url})` })
  assert.equal((await imageRead(2)).status, 404, 'Copying a private image URL into a readable document cannot broaden access')
  await request(2, `/pages/${publicPage.id}`, 'DELETE')
  assert.equal((await request<{
    pages: number
  }>(1, `${base}/usage`)).pages, 0)
  const exported = await fetch(new URL(`/api${base}/export`, origin), { headers: { Cookie: `sele_session=${accounts[1]!.token}` } })
  assert.equal(exported.status, 200)
  const archive = await new Bun.Archive(await exported.arrayBuffer()).files()
  assert.ok(!(await Promise.all([...archive.values()].map(file => file.text()))).join(' ').includes('SECRET_PERMISSION_TOKEN'), 'Export excludes restricted content')
  const answer = await request<{
    sources: unknown[]
  }>(2, '/questions', 'POST', { workspaceId, question: 'When is the SECRET_PERMISSION_TOKEN launch?' })
  assert.deepEqual(answer.sources, [], 'AI cannot retrieve restricted sources')
  const events = await request<{
    items: {
      target: string
    }[]
  }>(1, `${base}/activity`)
  assert.ok(!events.items.some(item => item.target.includes('Private launch')), 'Audit must not reveal private document titles')
  const email: EmailDelivery = { id: 'test', recipient: accounts[2]!.email, recipientUserId: accounts[2]!.userId, workspaceId, pageId: page.id, memberId: null, kind: 'comment', title: 'Private launch', activity: null, attempts: 1, leaseToken: 'test' }
  assert.equal(await new MySqlEmailOutbox(db).deliverable(email, new Date()), false, 'Queued email is rechecked against current access')
  await request(0, `${base}/groups`, 'POST', { name: 'Design', description: 'Project team', memberIds: [member(2).id] })
  const [group] = await request<MemberGroup[]>(0, `${base}/groups`)
  await request(1, `${base}/groups/${group!.id}`, 'PUT', { name: 'Design', memberIds: [member(1).id] }, 403)
  await request(0, folderPolicy, 'PUT', { mode: 'restricted', grants: [{ memberId: null, groupId: group!.id, level: 'comment', expiresAt: null }] })
  assert.equal((await request<{
    accessLevel: string
  }>(2, pagePath)).accessLevel, 'comment')
  await request(2, pagePath, 'PUT', { title: 'Illegal edit' }, 403)
  const anchor = { from: { tname: 'default', assoc: 0 }, to: { tname: 'default', assoc: -1 } }
  const thread = await request<{
    id: string
  }>(2, `${pagePath}/comments`, 'POST', { quote: 'Launch', body: 'Please review', anchor }, 201)
  await request(2, `${pagePath}/comments/${thread.id}/replies`, 'POST', { body: 'Commenting without edit is allowed' }, 201)
  await request(0, `${base}/members/${member(2).id}/access`, 'PUT', { kind: 'page', resourceId: page.id, level: 'edit', expiresAt: null })
  assert.equal((await request<{
    accessLevel: string
  }>(2, pagePath)).accessLevel, 'comment', 'Parent comment permission caps direct page edit grant')
  await request(0, `${base}/members/${member(2).id}/access`, 'PUT', { kind: 'folder', resourceId: folder.id, level: 'none', expiresAt: null })
  await request(2, pagePath, 'GET', undefined, 404)
  await request(0, `${base}/members/${member(2).id}/access`, 'PUT', { kind: 'folder', resourceId: folder.id, level: 'view', expiresAt: new Date(Date.now() + 3600000).toISOString() })
  assert.equal((await request<{
    accessLevel: string
  }>(2, pagePath)).accessLevel, 'view')
  await db.update(resourceGrants).set({ expiresAt: new Date(Date.now() - 60000) }).where(eq(resourceGrants.memberId, member(2).id))
  assert.equal((await request<{
    accessLevel: string
  }>(2, pagePath)).accessLevel, 'comment', 'Expired individual grant falls back to active group')
  await request(0, `${base}/groups/${group!.id}`, 'PUT', { name: 'Design', description: 'Project team', memberIds: [] })
  await request(2, pagePath, 'GET', undefined, 404)
  await request(0, folderPolicy, 'PUT', { mode: 'inherit', grants: [] })
  await request(2, pagePath)
  await request(0, `${base}/members/${member(2).id}`, 'PATCH', { suspended: true })
  await request(2, base, 'GET', undefined, 404)
  await request(2, pagePath, 'GET', undefined, 404)
  await request(0, `${base}/members/${member(2).id}`, 'PATCH', { suspended: false })
  await request(2, pagePath)
  const bulk = await request<{
    memberId: string
    success: boolean
  }[]>(0, `${base}/members/bulk`, 'POST', { memberIds: [member(0).id, member(3).id], action: 'role', role: 'member' })
  assert.equal(bulk.find(item => item.memberId === member(0).id)!.success, false)
  assert.equal(bulk.find(item => item.memberId === member(3).id)!.success, true)
  const directory = await request<{
    items: MemberItem[]
    total: number
  }>(0, `${base}/members/directory?status=active&role=admin`)
  assert.equal(directory.total, 1)
  assert.equal(directory.items[0]!.role, 'admin')
  await Promise.all(Array.from({ length: 16 }, () => request(0, folderPolicy, 'PUT', { mode: 'inherit', grants: [] })))
  const concurrentEmails = Array.from({ length: 12 }, () => `concurrent-${randomUUID()}@example.invalid`)
  const added = await Promise.all(concurrentEmails.map(email => request<MemberAddResult[]>(0, `${base}/members`, 'POST', { emails: [email], grants: [{ kind: 'folder', resourceId: folder.id, level: 'view', expiresAt: null }] }, 201)))
  assert.ok(added.every(results => results[0]?.status === 'added'), 'Concurrent grant transactions complete without exhausting the connection pool')
  const concurrentMembers = (await request<MemberItem[]>(0, `${base}/members`)).filter(item => concurrentEmails.includes(item.email))
  const removed = await request<{ success: boolean }[]>(0, `${base}/members/bulk`, 'POST', { memberIds: concurrentMembers.map(item => item.id), action: 'remove' })
  assert.ok(removed.every(item => item.success))
  await request(0, `${base}/members/${member(2).id}`, 'DELETE')
  await request(2, pagePath, 'GET', undefined, 404)
  roster = await request<MemberItem[]>(0, `${base}/members`)
  assert.equal(roster.length, 4)
  console.log('Member access checks passed: immediate access, email claim, role hierarchy, Viewer, groups, overrides, parent caps, expiry, comments, search, audit, email revalidation, suspension, bulk results and concurrent transaction saturation')
} finally {
  if (workspaceId) {
    const rows = await db.select({ id: pages.id }).from(pages).where(eq(pages.workspaceId, workspaceId))
    if (rows.length) {
      await db.delete(documents).where(inArray(documents.pageId, rows.map(item => item.id)))
    }
    await db.delete(pages).where(eq(pages.workspaceId, workspaceId))
    await db.delete(folders).where(eq(folders.workspaceId, workspaceId))
    await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId))
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId))
  }
  for (const account of accounts) {
    await db.delete(sessions).where(eq(sessions.userId, account.userId))
    await db.delete(users).where(eq(users.id, account.userId))
  }
  if (imageFilename) {
    await rm(resolve(process.env.UPLOAD_DIR || '.data/uploads', imageFilename), { force: true })
  }
  await database.close()
}
