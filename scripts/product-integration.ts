import { strict as assert } from 'node:assert'
import { eq } from 'drizzle-orm'
import { createUiFixture } from './support/uiFixture'
import type { CanvasSnapshot, WhiteboardContent, KanbanContent } from '../shared/model/content'
import type { ItemAttachment, ItemRelation, SavedSearch } from '../shared/model/itemResources'
import { notifications } from '../server/platform/database/schema'
import { TaskReminderWorker } from '../server/features/kanban/infrastructure/TaskReminderWorker'

const fixture = await createUiFixture()
const { request, origin, workspaceId } = fixture
async function raw(actor: number, path: string, method: string, body?: BodyInit, expected = 200) {
  const token = [fixture.ownerToken, fixture.memberToken, fixture.viewerToken][actor]!
  const result = await fetch(`${origin}/api${path}`, { method, headers: { Cookie: `sele_session=${token}`, Origin: origin }, body })
  assert.equal(result.status, expected, `${method} ${path}: ${result.status === expected ? '' : await result.text()}`)
  return result
}
async function item(kind: string, title = `Product ${kind}`) {
  return await request(0, `/workspaces/${workspaceId}/items`, 'POST', { title, kind }) as { id: string }
}
async function canvas(id: string) {
  return await request(0, `/items/${id}/canvas`) as CanvasSnapshot
}
async function save(actor: number, id: string, state: CanvasSnapshot, content = state.content) {
  return await request(actor, `/items/${id}/canvas`, 'PUT', { revision: state.revision, base: state.content, content }) as CanvasSnapshot
}
try {
  const drawing = await item('whiteboard'), document = await item('document'), diagram = await item('diagram')
  const initial = await canvas(drawing.id)
  const shape = (x: number) => ({ id: crypto.randomUUID(), type: 'rectangle' as const, x, y: 0, width: 100, height: 80, points: [], text: '', color: '#2563eb', size: 2 })
  await Promise.all([save(0, drawing.id, initial, { kind: 'whiteboard', elements: [shape(0)] }), save(1, drawing.id, initial, { kind: 'whiteboard', elements: [shape(200)] })])
  const both = await canvas(drawing.id)
  assert.equal((both.content as WhiteboardContent).elements.length, 2)
  const local = structuredClone(both.content) as WhiteboardContent, remote = structuredClone(local)
  local.elements[0]!.text = 'Owner change'
  remote.elements[0]!.text = 'Member change'
  await save(0, drawing.id, both, local)
  await assert.rejects(save(1, drawing.id, both, remote), /same object/)
  const presence = { sessionId: crypto.randomUUID(), cursor: { x: 25, y: 40 }, selected: [local.elements[0]!.id] }
  await request(1, `/items/${drawing.id}/presence`, 'POST', presence)
  assert.equal((await request(0, `/items/${drawing.id}/presence`) as unknown[]).length, 1)
  const form = new FormData()
  form.set('file', new File(['file contents'], 'note.txt'))
  const file = (await (await raw(0, `/items/${drawing.id}/attachments`, 'POST', form)).json()).data as ItemAttachment
  const content = await raw(2, `/items/${drawing.id}/attachments/${file.id}/content`, 'GET')
  assert.equal(await content.text(), 'file contents')
  const denied = new FormData()
  denied.set('file', new File(['denied'], 'no.txt'))
  await raw(2, `/items/${drawing.id}/attachments`, 'POST', denied, 403)
  const invalid = new FormData()
  invalid.set('file', new File(['note'], 'note.txt'))
  invalid.set('anchor', '{broken')
  await raw(0, `/items/${drawing.id}/attachments`, 'POST', invalid, 400)
  await request(0, `/items/${drawing.id}/relations`, 'POST', { targetId: document.id, sourceAnchor: { type: 'element', id: local.elements[0]!.id }, targetAnchor: null, label: 'Explains' })
  const imageForm = new FormData()
  imageForm.set('file', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jmioAAAAASUVORK5CYII=', 'base64')], 'pixel.png'))
  const image = (await (await raw(0, `/items/${drawing.id}/attachments`, 'POST', imageForm)).json()).data as ItemAttachment
  const imageBase = await canvas(drawing.id), withImage = structuredClone(imageBase.content) as WhiteboardContent
  withImage.elements.push({ ...shape(400), type: 'image', imageId: image.id })
  await save(0, drawing.id, imageBase, withImage)
  const template = await request(0, `/workspaces/${workspaceId}/templates/save`, 'POST', { itemId: drawing.id, title: 'Image template' }) as { id: string }
  const copy = await request(0, `/workspaces/${workspaceId}/templates`, 'POST', { templateId: template.id }) as { id: string }
  const copied = (await canvas(copy.id)).content as WhiteboardContent
  const copiedImage = copied.elements.find(element => element.type === 'image')!
  assert.notEqual(copiedImage.imageId, image.id)
  assert.equal((await raw(2, `/items/${copy.id}/attachments/${copiedImage.imageId}/content`, 'GET')).headers.get('content-type'), 'image/png')
  const archive = await new Bun.Archive(await (await raw(0, `/workspaces/${workspaceId}/export`, 'GET')).arrayBuffer()).files()
  const fileManifest = JSON.parse(await archive.get('files.json')!.text()) as { id: string, path: string }[]
  const exportedFile = fileManifest.find(value => value.id === file.id)!
  assert.ok(exportedFile.path.endsWith('note.txt'))
  assert.equal(await archive.get(exportedFile.path)!.text(), 'file contents')
  assert.ok(await archive.get('relations.json')!.text())
  const incoming = await request(0, `/items/${document.id}/resources`) as { relations: ItemRelation[] }
  assert.equal(incoming.relations[0]!.outgoing, false)
  assert.equal(incoming.relations[0]!.targetId, drawing.id)
  await request(0, `/items/${document.id}/access`, 'PUT', { mode: 'restricted', grants: [] })
  assert.equal((await request(1, `/items/${drawing.id}/resources`) as { relations: unknown[] }).relations.length, 0)
  await request(0, `/items/${drawing.id}/access`, 'PUT', { mode: 'restricted', grants: [] })
  await raw(1, `/items/${drawing.id}/attachments/${file.id}/content`, 'GET', undefined, 404)
  await raw(1, `/items/${drawing.id}/presence`, 'GET', undefined, 404)
  await request(0, `/items/${drawing.id}/access`, 'PUT', { mode: 'inherit', grants: [] })
  const result = await request(0, `/library/search?q=Product&workspaceId=${workspaceId}&kind=diagram`) as { id: string }[]
  assert.deepEqual(result.map(value => value.id), [diagram.id])
  await request(0, '/library/searches', 'POST', { name: 'Diagrams', query: 'Product', workspaceId, filters: { kind: 'diagram' } })
  const searches = await request(0, '/library/searches') as SavedSearch[]
  assert.equal(searches[0]!.filters.kind, 'diagram')
  assert.equal((await request(1, '/library/searches') as unknown[]).length, 0)
  await request(1, `/library/searches/${searches[0]!.id}`, 'DELETE')
  assert.equal((await request(0, '/library/searches') as unknown[]).length, 1)
  const board = await item('kanban'), empty = await canvas(board.id), tasks = structuredClone(empty.content) as KanbanContent
  tasks.tasks.push({ id: crypto.randomUUID(), number: 1, title: 'Monthly report', description: '', columnId: tasks.columns[0]!.id, priority: 'normal', assigneeId: null, dueDate: '2026-01-31', labels: ['finance'], checklist: [], createdAt: '2026-01-01T00:00:00Z', reminderAt: '2026-01-30T09:00:00Z', repeat: 'monthly' })
  tasks.columns[0]!.limit = 1
  tasks.nextNumber = 2
  const pending = await save(0, board.id, empty, tasks)
  const worker = new TaskReminderWorker(fixture.database, { report: (_message, cause) => {
    throw cause
  } })
  await worker.run(new Date('2026-01-30T10:00:00Z'))
  await worker.run(new Date('2026-01-30T10:01:00Z'))
  const reminders = await fixture.database.select().from(notifications).where(eq(notifications.kind, 'task'))
  assert.equal(reminders.length, 1)
  const completed = structuredClone(pending.content) as KanbanContent
  completed.tasks[0]!.completedAt = '2026-01-31T10:00:00Z'
  const scheduled = await save(0, board.id, pending, completed)
  assert.equal((scheduled.content as KanbanContent).tasks.length, 2)
  assert.equal((scheduled.content as KanbanContent).tasks[1]!.dueDate, '2026-02-28')
  const labelSearch = await request(0, `/library/search?q=&workspaceId=${workspaceId}&label=finance`) as { id: string }[]
  assert.equal(labelSearch[0]!.id, board.id)
  await worker.close()
  console.log('Product integration passed: concurrent merges/conflicts, presence, files/ACL, relations, personal search, image templates/export, recurring tasks/WIP and reminder deduplication')
} finally {
  await fixture.close()
}
