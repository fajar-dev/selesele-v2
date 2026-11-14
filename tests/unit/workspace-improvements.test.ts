import { expect, test } from 'bun:test'
import { CanvasDraftStorage } from '../../app/features/canvases/storage/CanvasDraftStorage'
import { CanvasSession } from '../../app/features/canvases/domain/CanvasSession'
import { ConversationClient } from '../../app/features/conversations/api/ConversationClient'
import { WorkspaceQuestionService } from '../../server/features/writing/application/WorkspaceQuestionService'
import { ConversationService } from '../../server/features/conversations/application/ConversationService'
import { commentThreadSchema } from '../../shared/validation/comment'
import type { ApiTransport } from '../../app/core/http/ApiTransport'
import type { CanvasSnapshot } from '../../shared/kernel/content'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => {
    values.set(key, value)
  }, removeItem: (key: string) => {
    values.delete(key)
  } }
}
test('local drafts survive remount, isolate accounts/items, expire, and reject corrupt content', () => {
  const storage = memoryStorage()
  const draft = new CanvasDraftStorage(storage, 'alice', 'board')
  const saved = { content: { kind: 'whiteboard' as const, elements: [] }, revision: 4, savedAt: 1000 }
  draft.write(saved)
  expect(new CanvasDraftStorage(storage, 'alice', 'board').read(2000)).toEqual(saved)
  expect(new CanvasDraftStorage(storage, 'bob', 'board').read(2000)).toBeNull()
  expect(new CanvasDraftStorage(storage, 'alice', 'other').read(2000)).toBeNull()
  expect(draft.read(1000 + 31 * 86400000)).toBeNull()
  storage.setItem('sele:canvas-draft:alice:board', JSON.stringify({ ...saved, content: { kind: 'whiteboard', elements: [{}] } }))
  expect(draft.read(2000)).toBeNull()
  storage.setItem('sele:canvas-draft:alice:board', '{')
  expect(draft.read()).toBeNull()
})
test('restored stale draft preserves both versions and blocks a silent overwrite', async () => {
  const snapshot: CanvasSnapshot = { content: { kind: 'whiteboard', elements: [] }, revision: 5, updatedAt: '' }
  let writes = 0
  const session = new CanvasSession({ get: async () => ({ data: snapshot }), save: async () => {
    writes++
    return { data: snapshot }
  } }, 'item', snapshot)
  session.edit({ kind: 'whiteboard', elements: [{ id: crypto.randomUUID(), type: 'text', x: 0, y: 0, width: 100, height: 100, text: 'Recovered', color: '#18181b', size: 2, points: [] }] })
  session.remote = snapshot
  await expect(session.save()).rejects.toThrow('Review')
  expect(writes).toBe(0)
  expect(session.dirty).toBe(true)
})
test('chat stream decodes split UTF-8 frames and requires a committed completion', async () => {
  const encoder = new TextEncoder()
  const detail = { id: 'chat', title: 'Chat', revision: 1, messages: [], updatedAt: '' }
  const data = encoder.encode(`${JSON.stringify({ type: 'delta', text: 'Halo 🌏' })}\n${JSON.stringify({ type: 'done', conversation: detail })}\n`)
  const transport = { request: async () => new ReadableStream({ start(controller) {
    for (const byte of data) {
      controller.enqueue(Uint8Array.of(byte))
    }
    controller.close()
  } }) } as unknown as ApiTransport
  let answer = ''
  const result = await new ConversationClient(transport).stream('workspace', 'chat', 'hello', 0, new AbortController().signal, (chunk) => {
    answer += chunk
  })
  expect(answer).toBe('Halo 🌏')
  expect(result).toEqual(detail)
  const interrupted = { request: async () => new ReadableStream({ start(controller) {
    controller.close()
  } }) } as unknown as ApiTransport
  await expect(new ConversationClient(interrupted).stream('workspace', 'chat', 'hello', 0, new AbortController().signal, () => {})).rejects.toThrow('interrupted')
})
test('AI streams progressively, records excerpts, and stops when access is revoked', async () => {
  let permitted = true
  const provider = { stream: () => new ReadableStream<string>({ start(controller) {
    controller.enqueue('First')
    controller.enqueue(' second')
    controller.close()
  } }) }
  const sources = [{ id: 'source', workspaceId: 'workspace', title: 'Plan', content: 'The actual evidence.' }]
  const questions = new WorkspaceQuestionService({ context: async () => sources }, provider)
  const chunks: string[] = []
  const answer = await questions.answer('user', 'plan', 'workspace', [], async (text) => {
    chunks.push(text)
  })
  expect(chunks).toEqual(['First', ' second'])
  expect(answer.sources[0]?.excerpt).toBe('The actual evidence.')
  const released: string[] = []
  await expect(questions.answer('user', 'plan', 'workspace', [], async (text) => {
    released.push(text)
    permitted = false
  }, undefined, async () => {
    if (!permitted) {
      throw new Error('Access revoked')
    }
  })).rejects.toThrow('Access revoked')
  expect(released).toEqual(['First'])
})
test('aborted AI questions never append an answer', async () => {
  const abort = new AbortController()
  let writes = 0
  const questions = new WorkspaceQuestionService({ context: async () => [{ id: 'source', workspaceId: 'workspace', title: 'Plan', content: 'Evidence' }] }, { stream: () => new ReadableStream<string>({ start(controller) {
    controller.enqueue('partial')
    controller.enqueue('remaining')
    controller.close()
  } }) })
  type Dependencies = ConstructorParameters<typeof ConversationService>
  const service = new ConversationService({ find: async () => ({ id: 'chat', title: '', updatedAt: '', revision: 0, messages: [] }), append: async () => {
    writes++
  } } as unknown as Dependencies[0], { requireMember: async () => {} } as unknown as Dependencies[1], { visible: async () => [{ id: 'source' }] } as unknown as Dependencies[2], questions)
  await expect(service.ask('workspace', 'user', 'chat', 'question', 0, async () => {
    abort.abort()
  }, abort.signal)).rejects.toThrow()
  expect(writes).toBe(0)
})
test('message search cannot reveal redacted answer content', async () => {
  type Dependencies = ConstructorParameters<typeof ConversationService>
  const summary = { id: 'chat', title: 'Discussion', updatedAt: '', revision: 1 }
  const service = new ConversationService({ list: async () => [summary], find: async () => ({ ...summary, messages: [{ id: 'answer', role: 'assistant', content: 'Secret acquisition', sources: [{ id: 'hidden', title: 'Hidden', workspaceId: 'workspace' }], createdAt: '' }] }) } as unknown as Dependencies[0], { requireMember: async () => {} } as unknown as Dependencies[1], { visible: async () => [] } as unknown as Dependencies[2], {} as Dependencies[3])
  expect(await service.list('workspace', 'user', 'acquisition')).toEqual([])
  expect(await service.list('workspace', 'user', 'Discussion')).toEqual([summary])
})
test('object comment anchors reject malformed IDs and unsupported target types', () => {
  const input = { quote: 'Task', body: 'Review this', anchor: { kind: 'object', objectType: 'task', objectId: crypto.randomUUID() } }
  expect(commentThreadSchema.safeParse(input).success).toBe(true)
  expect(commentThreadSchema.safeParse({ ...input, anchor: { ...input.anchor, objectId: 'arbitrary' } }).success).toBe(false)
  expect(commentThreadSchema.safeParse({ ...input, anchor: { ...input.anchor, objectType: 'workspace' } }).success).toBe(false)
})

test('follow-up citations keep current excerpts and preserve their citation order', async () => {
  type Dependencies = ConstructorParameters<typeof ConversationService>
  const fresh = { id: 'same', workspaceId: 'workspace', title: 'Current', excerpt: 'Updated evidence' }
  const old = { ...fresh, excerpt: 'Outdated evidence' }
  const additional = { id: 'other', workspaceId: 'workspace', title: 'Other', excerpt: 'Other evidence' }
  let captured: unknown
  const summary = { id: 'chat', title: '', updatedAt: '', revision: 1 }
  const service = new ConversationService({
    find: async () => ({ ...summary, messages: [{ id: 'previous', role: 'assistant', content: 'Previous', sources: [old], createdAt: '' }] }),
    append: async (_workspace: string, _user: string, _id: string, _revision: number, _question: string, answer: { sources: unknown }) => {
      captured = answer.sources
    }
  } as unknown as Dependencies[0], { requireMember: async () => {} } as unknown as Dependencies[1], { visible: async () => [fresh, additional] } as unknown as Dependencies[2], { answer: async () => ({ answer: 'Answer [1] [2]', sources: [additional, fresh] }) } as unknown as Dependencies[3])
  await service.ask('workspace', 'user', 'chat', 'Follow-up', 1)
  expect(captured).toEqual([additional, fresh])
})

test('stale recovery retains its original base revision across repeated reloads', async () => {
  const latest: CanvasSnapshot = { content: { kind: 'whiteboard', elements: [] }, revision: 5, updatedAt: '2026-11-14T00:00:00Z' }
  const gateway = { get: async () => ({ data: latest }), save: async () => ({ data: latest }) }
  const draft = { kind: 'whiteboard' as const, elements: [{ id: crypto.randomUUID(), type: 'text' as const, x: 0, y: 0, width: 100, height: 100, text: 'Old draft', color: '#18181b', size: 2, points: [] }] }
  const first = new CanvasSession(gateway, 'item', latest)
  first.restore(draft, 4)
  expect(first.draftRevision).toBe(4)
  expect(first.remote?.revision).toBe(5)
  const backup = new CanvasDraftStorage(memoryStorage(), 'alice', 'item')
  backup.write({ content: first.draft, revision: first.draftRevision, savedAt: Date.now() })
  const saved = backup.read()!
  const next = new CanvasSession(gateway, 'item', latest)
  next.restore(saved.content, saved.revision)
  expect(next.remote?.revision).toBe(5)
  await expect(next.save()).rejects.toThrow('Review')
  next.load(latest)
  expect(next.draftRevision).toBe(5)
  expect(next.dirty).toBe(false)
})
