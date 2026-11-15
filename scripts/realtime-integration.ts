import { strict as assert } from 'node:assert'
import { count, eq } from 'drizzle-orm'
import * as Y from 'yjs'
import * as sync from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { createUiFixture } from './support/uiFixture'
import { items, realtimeEvents } from '../server/platform/database/schema'
import type { RealtimeFrame, RealtimeTopic } from '../shared/model/realtime'

async function until(predicate: () => boolean | Promise<boolean>, message: string, timeout = 8000) {
  const deadline = Date.now() + timeout
  while (!await predicate()) {
    if (Date.now() > deadline) {
      throw new Error(message)
    }
    await Bun.sleep(25)
  }
}
class StreamProbe {
  readonly frames: RealtimeFrame[] = []
  private readonly abort = new AbortController()
  private reading?: Promise<void>
  async open(origin: string, token: string) {
    const response = await fetch(`${origin}/api/realtime/events`, { headers: { Cookie: `sele_session=${token}` }, signal: this.abort.signal })
    assert.equal(response.status, 200)
    const reader = response.body!.getReader()
    this.reading = (async () => {
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (true) {
          const result = await reader.read()
          if (result.done) {
            break
          }
          buffer += decoder.decode(result.value, { stream: true })
          let boundary: number
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const line = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            if (line.startsWith('data: ')) {
              this.frames.push(JSON.parse(line.slice(6)))
            }
          }
        }
      } catch { /* Abort closes this test subscription. */ } finally {
        reader.releaseLock()
      }
    })()
    await until(() => this.frames.some(frame => frame.type === 'ready'), 'Realtime stream did not initialize')
  }

  async change(topic: RealtimeTopic, action: () => Promise<unknown>) {
    const start = this.frames.length
    await action()
    await until(() => this.frames.slice(start).some(frame => frame.type === 'changes' && frame.changes.some(change => change.topics.includes(topic))), `Missing realtime event: ${topic}`)
  }

  async close() {
    this.abort.abort()
    await this.reading
  }
}
class DocumentPeer {
  readonly document = new Y.Doc()
  readonly awareness = new awarenessProtocol.Awareness(this.document)
  readonly socket: WebSocket
  constructor(origin: string, itemId: string, token: string) {
    this.socket = new WebSocket(`${origin.replace('http:', 'ws:')}/collaboration/${itemId}`, { headers: { Cookie: `sele_session=${token}`, Origin: origin } })
    this.socket.binaryType = 'arraybuffer'
    this.socket.addEventListener('open', () => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, 0)
      sync.writeSyncStep1(encoder, this.document)
      this.socket.send(encoding.toUint8Array(encoder))
      this.awareness.setLocalStateField('user', { name: `Peer ${this.document.clientID}` })
    })
    this.socket.addEventListener('message', (event) => {
      const decoder = decoding.createDecoder(new Uint8Array(event.data as ArrayBuffer)), type = decoding.readVarUint(decoder)
      if (type === 1) {
        awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), 'remote')
        return
      }
      if (type !== 0) {
        return
      }
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, 0)
      sync.readSyncMessage(decoder, encoder, this.document, 'remote')
      if (encoding.length(encoder) > 1) {
        this.socket.send(encoding.toUint8Array(encoder))
      }
    })
    this.awareness.on('update', ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }, origin: unknown) => {
      if (origin === 'remote' || this.socket.readyState !== WebSocket.OPEN) {
        return
      }
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, 1)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [...added, ...updated, ...removed]))
      this.socket.send(encoding.toUint8Array(encoder))
    })
    this.document.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || this.socket.readyState !== WebSocket.OPEN) {
        return
      }
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, 0)
      sync.writeUpdate(encoder, update)
      this.socket.send(encoding.toUint8Array(encoder))
    })
  }

  append(text: string) {
    const fragment = this.document.getXmlFragment('default'), paragraph = fragment.get(0) as Y.XmlElement
    this.document.transact(() => {
      paragraph.insert(paragraph.length, [new Y.XmlText(text)])
    })
  }

  close() {
    this.socket.close()
    this.awareness.destroy()
    this.document.destroy()
  }
}
const fixture = await createUiFixture(13824), replicaOrigin = 'http://127.0.0.1:13825'
const replica = Bun.spawn(['bun', '.output/server/index.mjs'], { env: { ...process.env, DB_NAME: fixture.databaseName, APP_ORIGIN: replicaOrigin, HOST: '127.0.0.1', PORT: '13825', NODE_ENV: 'production', MAIL_ENABLED: 'false', AI_BASE_URL: '', AI_API_KEY: '', AI_MODEL: '' }, stdout: 'ignore', stderr: 'inherit' })
const owner = new StreamProbe(), member = new StreamProbe()
const peers: DocumentPeer[] = []
async function request(actor: number, path: string, method = 'GET', body?: unknown) {
  const origin = actor ? replicaOrigin : fixture.origin, token = actor ? fixture.memberToken : fixture.ownerToken
  const response = await fetch(`${origin}/api${path}`, { method, headers: { 'Cookie': `sele_session=${token}`, 'Origin': origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  const value = await response.json() as {
    data: unknown
    message?: string
  }
  assert.ok(response.ok, `${method} ${path}: ${value.message}`)
  return value.data
}
try {
  await until(() => fetch(`${replicaOrigin}/api/health`).then(value => value.ok, () => false), 'Replica did not start')
  await Promise.all([owner.open(fixture.origin, fixture.ownerToken), member.open(replicaOrigin, fixture.memberToken)])
  await Bun.sleep(400)
  const workspace = `/workspaces/${fixture.workspaceId}`
  let drawing = { id: '' }, document = { id: '' }, folder = { id: '' }
  await member.change('items', async () => {
    drawing = await request(0, `${workspace}/items`, 'POST', { kind: 'whiteboard', title: 'Live drawing' }) as typeof drawing
  })
  await member.change('items', () => request(0, `/items/${drawing.id}`, 'PUT', { title: 'Renamed by owner' }))
  assert.equal((await request(1, `/items/${drawing.id}`) as {
    title: string
  }).title, 'Renamed by owner')
  await member.change('folders', async () => {
    folder = await request(0, `${workspace}/folders`, 'POST', { name: 'Live folder' }) as typeof folder
  })
  await member.change('folders', () => request(0, `${workspace}/folders/${folder.id}`, 'PATCH', { name: 'Updated folder' }))
  await member.change('workspaces', () => request(0, workspace, 'PATCH', { name: 'Realtime workspace' }))
  await member.change('workspaces', () => request(0, `${workspace}/settings`, 'PATCH', { trashRetentionDays: 7 }))
  const shape = { id: crypto.randomUUID(), type: 'rectangle', x: 0, y: 0, width: 100, height: 80, points: [], text: '', color: '#2563eb', size: 2 }
  await member.change('content', () => request(0, `/items/${drawing.id}/canvas`, 'PUT', { revision: 0, content: { kind: 'whiteboard', elements: [shape] } }))
  await member.change('comments', () => request(0, `/items/${drawing.id}/comments`, 'POST', { quote: 'Rectangle', body: 'Review this shape', anchor: { kind: 'object', objectId: shape.id, objectType: 'element' } }))
  await member.change('templates', () => request(0, `${workspace}/templates/save`, 'POST', { itemId: drawing.id, title: 'Live template' }))
  const upload = new FormData()
  upload.set('file', new File(['Shared attachment'], 'shared.txt'))
  await member.change('attachments', async () => {
    const response = await fetch(`${fixture.origin}/api/items/${drawing.id}/attachments`, { method: 'POST', headers: { Cookie: `sele_session=${fixture.ownerToken}`, Origin: fixture.origin }, body: upload })
    assert.equal(response.status, 200)
  })
  document = await request(0, `${workspace}/items`, 'POST', { kind: 'document', title: 'Shared document' }) as typeof document
  await member.change('relations', () => request(0, `/items/${drawing.id}/relations`, 'POST', { targetId: document.id, label: 'Reference' }))
  await member.change('presence', () => request(0, `/items/${drawing.id}/presence`, 'POST', { sessionId: crypto.randomUUID(), cursor: { x: 20, y: 30 }, selected: [shape.id] }))
  const privateStart = member.frames.length
  await owner.change('library', () => request(0, `/items/${drawing.id}/favorite`, 'POST', { favorite: true }))
  await owner.change('conversations', () => request(0, `${workspace}/conversations`, 'POST'))
  await Bun.sleep(300)
  assert.ok(!member.frames.slice(privateStart).some(frame => frame.type === 'changes' && frame.changes.some(change => change.topics.some(topic => ['library', 'conversations'].includes(topic)))), 'Private state leaked to another member')
  const [beforeRollback] = await fixture.database.select({ value: count() }).from(realtimeEvents)
  await assert.rejects(fixture.database.transaction(async (tx) => {
    await tx.update(items).set({ description: 'Never committed' }).where(eq(items.id, drawing.id))
    throw new Error('Rollback fixture')
  }))
  const [afterRollback] = await fixture.database.select({ value: count() }).from(realtimeEvents)
  assert.equal(afterRollback!.value, beforeRollback!.value, 'Rolled-back mutations produced an event')
  const beforeSlow = new Set((await fixture.database.select({ id: realtimeEvents.id }).from(realtimeEvents)).map(event => event.id))
  let releaseSlow = () => { }, slowStarted = () => { }
  const hold = new Promise<void>((resolve) => {
      releaseSlow = resolve
    }), started = new Promise<void>((resolve) => {
      slowStarted = resolve
    })
  let slowEvent = ''
  const slow = fixture.database.transaction(async (tx) => {
    await tx.update(items).set({ description: 'Slow transaction' }).where(eq(items.id, drawing.id))
    slowEvent = (await tx.select().from(realtimeEvents).where(eq(realtimeEvents.topic, 'items'))).find(event => !beforeSlow.has(event.id))!.id
    slowStarted()
    await hold
  })
  await started
  await member.change('items', () => request(0, `/items/${document.id}`, 'PUT', { description: 'Fast transaction' }))
  const fast = (await fixture.database.select().from(realtimeEvents).where(eq(realtimeEvents.topic, 'items'))).filter(event => !beforeSlow.has(event.id) && event.sequence !== null)
  assert.ok(fast.length)
  releaseSlow()
  await slow
  await until(async () => Number((await fixture.database.select().from(realtimeEvents).where(eq(realtimeEvents.id, slowEvent)))[0]?.sequence || 0) > Math.max(...fast.map(event => event.sequence!)), 'Late commit was skipped by the change feed')
  await request(0, `/items/${document.id}/content`, 'POST', { content: 'Seed paragraph' })
  const first = new DocumentPeer(fixture.origin, document.id, fixture.ownerToken), second = new DocumentPeer(replicaOrigin, document.id, fixture.memberToken)
  peers.push(first, second)
  await until(() => peers.every(peer => peer.document.getXmlFragment('default').length > 0), 'Document replicas did not initialize')
  await until(() => peers.every(peer => peer.awareness.getStates().size === 2), 'Document presence did not converge across processes')
  first.append('Alpha from process one')
  second.append('Beta from process two')
  await until(() => peers.every(peer => ['Alpha', 'Beta'].every(word => peer.document.getXmlFragment('default').toString().includes(word))), 'Document edits did not converge across processes')
  const markdown = await request(1, `/items/${document.id}/content`) as {
    content: string
  }
  assert.ok(markdown.content.includes('Alpha') && markdown.content.includes('Beta'))
  const roster = await request(0, `${workspace}/members`) as {
    id: string
    name: string
  }[]
  const target = roster.find(member => member.name === 'UI Member')!
  await member.change('access', () => request(0, `${workspace}/members/${target.id}`, 'DELETE'))
  const denied = await fetch(`${replicaOrigin}/api/items/${drawing.id}`, { headers: { Cookie: `sele_session=${fixture.memberToken}` } })
  assert.equal(denied.status, 404)
  await until(() => second.socket.readyState === WebSocket.CLOSED, 'Revoked editor stayed connected to another process')
  console.log('Realtime integration passed: two processes, all workspace mutations, private state isolation, rollback safety, late commit ordering, convergent document edits and immediate access revocation')
} finally {
  for (const peer of peers) {
    peer.close()
  }
  await Promise.all([owner.close(), member.close()])
  replica.kill('SIGTERM')
  await replica.exited
  await fixture.close()
}
