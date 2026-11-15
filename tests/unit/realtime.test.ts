import { QueryPresentation } from '../../app/core/realtime/domain/QueryPresentation'
import { expect, test } from 'bun:test'
import { RealtimeQueryRegistry } from '../../app/core/realtime/application/RealtimeQueryRegistry'
import { RealtimeQueryCatalog } from '../../app/core/realtime/domain/RealtimeQueryCatalog'
import { RealtimeService } from '../../server/features/realtime/application/RealtimeService'
import type { RealtimeEvent, RealtimeRepository } from '../../server/features/realtime/domain/RealtimeRepository'
import { matchesRealtimeScope } from '../../shared/model/realtime'
import { captureDefinitions, captureMigration } from '../../scripts/support/changeCapture'

const pause = () => Bun.sleep(90)
test('query synchronization coalesces observers and repeats a fetch invalidated in flight', async () => {
  const registry = new RealtimeQueryRegistry()
  let calls = 0, release: () => void = () => { }
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  const refresh = async () => {
    calls++
    if (calls === 1) {
      await pending
    }
  }
  registry.register('items', { workspaceId: 'a', topics: ['items'] }, refresh)
  registry.register('items', { workspaceId: 'a', topics: ['items'] }, refresh)
  registry.invalidate([{ workspaceId: 'b', topics: ['items'] }])
  await pause()
  expect(calls).toBe(0)
  registry.invalidate([{ workspaceId: 'a', topics: ['items'] }])
  registry.invalidate([{ workspaceId: 'a', topics: ['items'] }])
  await pause()
  expect(calls).toBe(1)
  registry.invalidate([{ workspaceId: 'a', topics: ['items'] }])
  release()
  await pause()
  expect(calls).toBe(2)
  registry.dispose()
})
test('disposing observers prevents queued work and reconnect rehydrates active scopes', async () => {
  const registry = new RealtimeQueryRegistry()
  let calls = 0
  const remove = registry.register('files', { topics: ['attachments'] }, async () => {
    calls++
  })
  registry.invalidate()
  remove()
  await pause()
  expect(calls).toBe(0)
  registry.register('files', { topics: ['attachments'] }, async () => {
    calls++
  })
  registry.invalidate()
  await pause()
  expect(calls).toBe(1)
  registry.dispose()
})
test('query dependencies cover workspace screens and private global state', () => {
  const catalog = new RealtimeQueryCatalog()
  expect(matchesRealtimeScope(catalog.describe('library:my-tasks'), { workspaceId: 'other', topics: ['content'] })).toBe(true)
  expect(matchesRealtimeScope(catalog.describe('workspaces:a:items'), { workspaceId: 'b', topics: ['items'] })).toBe(false)
  expect(matchesRealtimeScope(catalog.describe('workspace-settings:a'), { workspaceId: 'a', topics: ['settings'] })).toBe(true)
  expect(matchesRealtimeScope(catalog.describe('library:my-tasks'), { workspaceId: 'a', topics: ['folders'] })).toBe(true)
  expect(matchesRealtimeScope(catalog.describe('canvas:item'), { workspaceId: 'a', topics: ['folders'] })).toBe(true)
  expect(() => catalog.describe('forgotten-query')).toThrow('Missing realtime')
})
test('server feed isolates personal events and does not expose hidden object content or identifiers', async () => {
  let events: RealtimeEvent[] = []
  const repository: RealtimeRepository = {
    publish: async () => { }, latestSequence: async () => 0, changes: async after => events.filter(event => event.sequence > after),
    memberships: async () => [{ userId: 'owner', workspaceId: 'workspace' }, { userId: 'member', workspaceId: 'workspace' }], prune: async () => { }
  }
  const errors: unknown[] = []
  const service = new RealtimeService(repository, { apply: async () => { } }, { report: (_message, cause) => {
    errors.push(cause)
  } })
  await service.synchronize()
  const owner = service.stream('owner', async () => { }).body!.getReader(), member = service.stream('member', async () => { }).body!.getReader()
  await owner.read()
  await member.read()
  events = [
    { sequence: 1, workspaceId: 'workspace', userId: null, topic: 'items' },
    { sequence: 2, workspaceId: null, userId: 'owner', topic: 'library' },
    { sequence: 3, workspaceId: 'workspace', userId: 'owner', topic: 'conversations' }
  ]
  await service.synchronize()
  const ours = new TextDecoder().decode((await owner.read()).value), theirs = new TextDecoder().decode((await member.read()).value)
  expect(ours).toContain('conversations')
  expect(ours).toContain('library')
  expect(theirs).toContain('items')
  expect(theirs).not.toContain('conversations')
  expect(theirs).not.toContain('library')
  expect(theirs).not.toContain('userId')
  expect(errors).toEqual([])
  await owner.cancel()
  await member.cancel()
  await service.close()
})
test('transactional capture covers every business mutation and excludes infrastructure projections', async () => {
  const sql = captureMigration()
  expect(await Bun.file('drizzle/0001_realtime_capture.sql').text()).toBe(sql)
  const covered = new Set(captureDefinitions.map(definition => definition.table))
  const internal = new Set(['realtime_events', 'realtime_clock', 'email_deliveries', 'item_mentions', 'document_images'])
  const schema = await Bun.file('drizzle/meta/0000_snapshot.json').json()
  for (const name of Object.keys(schema.tables)) {
    expect(covered.has(name) || internal.has(name)).toBe(true)
  }
  expect(sql).toContain('BEFORE DELETE ON workspace_members')
  expect(sql).toContain('capture_member_preferences')
})

test('background refresh retains the editor even for an empty snapshot, while first load and explicit clear still show loading', () => {
  const presentation = new QueryPresentation()
  expect(presentation.status('pending')).toBe('pending')
  presentation.observe('success')
  expect(presentation.status('pending')).toBe('success')
  expect(presentation.status('error')).toBe('error')
  presentation.observe('idle')
  expect(presentation.status('pending')).toBe('pending')
})
