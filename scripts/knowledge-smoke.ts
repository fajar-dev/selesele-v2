import { ConsoleErrorReporter } from '../server/platform/runtime/ConsoleErrorReporter'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { prosemirrorJSONToYDoc } from 'y-prosemirror'
import * as Y from 'yjs'
import { MySqlDocumentRepository } from '../server/features/pages/infrastructure/MySqlDocumentRepository'
import { MySqlNotificationRepository } from '../server/features/notifications/infrastructure/MySqlNotificationRepository'
import { NotificationService } from '../server/features/notifications/application/NotificationService'
import { CryptographicTokens } from '../server/features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../server/platform/runtime/SystemClock'
import { randomUUID } from 'node:crypto'
import { strict as assert } from 'node:assert'
import { eq, inArray } from 'drizzle-orm'
import { createDatabase } from '../server/platform/database/client'
import { documents, folders, pages, sessions, users, workspaceInvitations, workspaceMembers, workspaces } from '../server/platform/database/schema'
import { MySqlUserRepository } from '../server/features/identity/infrastructure/MySqlUserRepository'
import { MySqlSessionRepository } from '../server/features/identity/infrastructure/MySqlSessionRepository'
import { AuthService } from '../server/features/identity/application/AuthService'

const origin = new URL(process.env.SMOKE_ORIGIN || 'http://localhost:3000')
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Integration smoke requires a local server')
const database = createDatabase()
const auth = new AuthService(new MySqlUserRepository(database.db), new MySqlSessionRepository(database.db), new CryptographicTokens(), new SystemClock())
const accounts: { userId: string, token: string, email: string }[] = []
const workspaceIds: string[] = []

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
    const email = `knowledge-smoke-${label}-${randomUUID()}@example.invalid`
    const result = await auth.login({ subject: `${randomUUID()}:${randomUUID()}`, email, name: `Knowledge ${label}` }, null)
    accounts.push({ userId: result.user.id, token: result.token, email })
  }
  const workspace = await request<{ id: string }>(0, '/workspaces', 'POST', { name: 'Knowledge workspace' }, 201)
  workspaceIds.push(workspace.id)
  const privateWorkspace = await request<{ id: string }>(2, '/workspaces', 'POST', { name: 'Outsider workspace' }, 201)
  workspaceIds.push(privateWorkspace.id)
  const base = `/workspaces/${workspace.id}`
  await request(0, `${base}/invitations`, 'POST', { email: accounts[1]!.email, role: 'member' }, 201)
  const notices = await request<{ kind: string }[]>(1, '/notifications')
  assert.ok(notices.some(item => item.kind === 'invitation'), 'Invitation notification')
  const invites = await request<{ id: string }[]>(1, '/invitations')
  await request(1, `/invitations/${invites[0]!.id}/accept`, 'POST')
  const folder = await request<{ id: string }>(0, `${base}/folders`, 'POST', { name: 'Plans' }, 201)
  const page = await request<{ id: string }>(0, `${base}/pages`, 'POST', { title: 'Launch plan', folderId: folder.id }, 201)
  const linked = await request<{ id: string }>(0, `${base}/pages`, 'POST', { title: 'Meeting decisions' }, 201)
  const privatePage = await request<{ id: string }>(2, `/workspaces/${privateWorkspace.id}/pages`, 'POST', { title: 'Launch secrets' }, 201)
  await request(2, `/pages/${privatePage.id}/content`, 'POST', { content: 'DO_NOT_LEAK_PRIVATE Launch secret is Saturday.' })
  const pagePath = `/pages/${page.id}`
  await request(0, `${pagePath}/content`, 'POST', { content: '# Launch plan\n\nThe launch is Monday. UniqueKnowledgeWord.' })
  await request(0, `/pages/${linked.id}/content`, 'POST', { content: `[Launch plan](/workspaces/${workspace.id}/pages/${page.id})` })
  const search = await request<{ id: string }[]>(1, '/library/search?q=UniqueKnowledgeWord')
  assert.ok(search.some(row => row.id === page.id), 'Search matches document body')
  const privateSearch = await request<{ id: string }[]>(1, '/library/search?q=Launch')
  assert.ok(!privateSearch.some(row => row.id === privatePage.id), 'Search does not expose another workspace')
  await request(2, `/library/search?q=Launch&workspaceId=${workspace.id}`, 'GET', undefined, 404)
  await request(1, `${pagePath}/favorite`, 'POST', { favorite: true })
  await request(1, `${pagePath}/visit`, 'POST')
  let personal = await request<{ favorites: { id: string }[], recent: { id: string }[] }>(1, '/library/personal')
  assert.equal(personal.favorites[0]!.id, page.id)
  assert.equal(personal.recent[0]!.id, page.id)
  const backlinks = await request<{ id: string }[]>(1, `${pagePath}/backlinks`)
  assert.equal(backlinks[0]!.id, linked.id)
  await request(2, `${pagePath}/backlinks`, 'GET', undefined, 404)
  await request(0, `${pagePath}/versions`, 'POST')
  const versions = await request<{ id: string }[]>(1, `${pagePath}/versions`)
  const saved = versions[0]!.id
  await request(0, `${pagePath}/content`, 'POST', { content: 'Changed launch content.' })
  await request(1, `${pagePath}/versions/${saved}/restore`, 'POST')
  const restoredContent = await request<{ content: string }>(0, `${pagePath}/content`)
  assert.ok(restoredContent.content.includes('Monday'), 'Version restored through collaboration')
  const allVersions = await request<{ id: string }[]>(0, `${pagePath}/versions`)
  const contents = await Promise.all(allVersions.map(version => request<{ content: string }>(0, `${pagePath}/versions/${version.id}`)))
  assert.ok(contents.some(version => version.content.includes('Changed launch content')), 'Restore checkpoints the current content')
  await request(2, `${pagePath}/versions`, 'GET', undefined, 404)
  await request(0, `/pages/${linked.id}/versions/${saved}`, 'GET', undefined, 404)
  const templates = await request<{ id: string }[]>(1, '/templates')
  assert.equal(templates.length, 4)
  const fromTemplate = await request<{ id: string }>(1, `${base}/templates`, 'POST', { templateId: 'meeting', folderId: folder.id })
  assert.ok((await request<{ content: string }>(1, `/pages/${fromTemplate.id}/content`)).content.includes('## Agenda'))
  await request(2, `${base}/templates`, 'POST', { templateId: 'meeting' }, 404)
  const eventResponse = await fetch(new URL('/api/notifications/events', origin), { headers: { Cookie: `sele_session=${accounts[1]!.token}` } })
  assert.equal(eventResponse.headers.get('content-type'), 'text/event-stream')
  const reader = eventResponse.body!.getReader()
  await reader.read()
  try {
    const update = reader.read()
    const thread = await request<{ id: string }>(0, `${pagePath}/comments`, 'POST', { quote: 'launch', body: `Please review @${accounts[1]!.email}`, anchor: {
      from: { type: { client: 1, clock: 1 }, item: { client: 1, clock: 2 }, assoc: 0 },
      to: { type: { client: 1, clock: 1 }, item: { client: 1, clock: 8 }, assoc: 0 }
    } }, 201)
    const event = await Promise.race([update, Bun.sleep(3000).then(() => {
      throw new Error('SSE notification did not arrive')
    })])
    assert.ok(new TextDecoder().decode(event.value).includes('refresh'), 'Notification invalidates without polling')
    const mentions = await request<{ kind: string, pageId: string }[]>(1, '/notifications')
    assert.ok(mentions.some(item => item.kind === 'mention' && item.pageId === page.id))
    await request(1, `${pagePath}/comments/${thread.id}/replies`, 'POST', { body: 'Reviewed.' }, 201)
    const replies = await request<{ kind: string }[]>(0, '/notifications')
    assert.ok(replies.some(item => item.kind === 'reply'), 'Reply notifies participants')
    await request(1, '/notifications', 'PATCH')
    assert.ok((await request<{ readAt: string | null }[]>(1, '/notifications')).every(item => !!item.readAt))
  } finally {
    await reader.cancel()
  }
  const mentionPage = await request<{ id: string }>(0, `${base}/pages`, 'POST', { title: 'Mention test' }, 201)
  const mentionDocument = prosemirrorJSONToYDoc(getSchema([StarterKit, Mention]), {
    type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'mention', attrs: { id: accounts[1]!.userId, label: 'Knowledge member' } }] }]
  }, 'default')
  try {
    const publisher = new NotificationService(new MySqlNotificationRepository(database.db, false), () => {}, new ConsoleErrorReporter())
    const repository = new MySqlDocumentRepository(database.db, publisher, new SystemClock())
    const state = Y.encodeStateAsUpdate(mentionDocument)
    await repository.saveState(mentionPage.id, state, '@Knowledge member', accounts[0]!.userId)
    await repository.saveState(mentionPage.id, state, '@Knowledge member', accounts[0]!.userId)
    const mentioned = await request<{ kind: string, pageId: string }[]>(1, '/notifications')
    assert.equal(mentioned.filter(item => item.kind === 'mention' && item.pageId === mentionPage.id).length, 1, 'Document mentions use stable member IDs and do not duplicate on autosave')
  } finally {
    mentionDocument.destroy()
  }
  const answer = await request<{ answer: string, sources: { id: string }[] }>(1, '/questions', 'POST', { question: 'When is the launch?', workspaceId: workspace.id })
  assert.ok(answer.answer.includes('[1]'))
  assert.ok(answer.sources.some(source => source.id === page.id))
  assert.ok(!answer.sources.some(source => source.id === privatePage.id))
  await request(2, '/questions', 'POST', { question: 'When is launch?', workspaceId: workspace.id }, 404)
  await request(1, '/questions', 'POST', { question: 'Launch simulate gateway failure', workspaceId: workspace.id }, 503)
  await request(0, `${base}/folders/${folder.id}`, 'DELETE')
  await request(1, pagePath, 'GET', undefined, 404)
  assert.ok(!(await request<{ id: string }[]>(1, '/library/search?q=UniqueKnowledgeWord')).some(row => row.id === page.id))
  await request(1, `/trash/folder/${folder.id}`, 'DELETE', undefined, 403)
  await request(1, `/trash/folder/${folder.id}/restore`, 'POST')
  assert.ok((await request<{ content: string }>(1, `${pagePath}/content`)).content.includes('Monday'))
  await request(1, pagePath, 'DELETE')
  await request(2, `/trash/page/${page.id}/restore`, 'POST', undefined, 404)
  await request(1, `/trash/page/${page.id}`, 'DELETE', undefined, 403)
  await request(1, `/trash/page/${page.id}/restore`, 'POST')
  await request(0, `${base}/members/${accounts[1]!.userId}`, 'DELETE')
  personal = await request(1, '/library/personal')
  assert.equal(personal.favorites.length, 0, 'Revoked documents disappear from favorites')
  assert.equal(personal.recent.length, 0)
  assert.equal((await request<unknown[]>(1, '/notifications')).length, 0, 'Revoked document notifications are hidden')
  await request(0, base, 'DELETE')
  await request(1, `/trash/workspace/${workspace.id}/restore`, 'POST', undefined, 404)
  await request(0, `/trash/workspace/${workspace.id}/restore`, 'POST')
  await request(0, pagePath)
  await request(0, `${base}/folders/${folder.id}`, 'DELETE')
  await request(0, `/trash/folder/${folder.id}`, 'DELETE')
  await request(0, pagePath, 'GET', undefined, 404)
  await request(0, base, 'DELETE')
  await request(0, `/trash/workspace/${workspace.id}`, 'DELETE')
  assert.ok(!(await request<{ id: string }[]>(0, '/trash')).some(item => item.id === workspace.id))
  console.log('Knowledge integration passed: trash/restore/purge, versions, body search and isolation, favorites/recent, backlinks, templates, SSE notifications, mentions/replies, cited workspace AI and gateway errors')
} finally {
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
