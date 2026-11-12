import { describe, expect, test } from 'bun:test'
import { uuidv7 } from 'uuidv7'
import { CommentService } from '../../server/application/CommentService'
import { PageService } from '../../server/application/PageService'
import { WorkspaceService } from '../../server/application/WorkspaceService'
import { FolderService } from '../../server/application/FolderService'
import type { CommentRepository } from '../../server/domain/ports/CommentRepository'
import type { CommentThread } from '../../server/domain/entities/CommentThread'
import type { CommentThreadInput } from '../../shared/types/comment'
import { commentThreadSchema, commentBodySchema, commentResolutionSchema } from '../../shared/validation/comment'
import { MemoryPages, MemoryWorkspaces, MemoryFolders, OWNER_ID, EDITOR_ID, WORKSPACE_ID } from '../support/fakes'

const input: CommentThreadInput = { body: 'Please clarify this.', quote: 'Shared text', anchor: {
  from: { type: { client: 123, clock: 1 }, item: { client: 123, clock: 2 }, assoc: 0 },
  to: { type: { client: 123, clock: 1 }, item: { client: 123, clock: 12 }, assoc: 0 }
} }
class MemoryComments implements CommentRepository {
  rows = new Map<string, CommentThread>()
  async list(pageId: string) {
    return [...this.rows.values()].filter(row => row.pageId === pageId)
  }

  async find(pageId: string, id: string) {
    return this.rows.get(id)?.pageId === pageId ? this.rows.get(id)! : null
  }

  async create(pageId: string, value: CommentThreadInput, userId: string) {
    const id = uuidv7()
    this.rows.set(id, { id, pageId, quote: value.quote, anchor: value.anchor, createdBy: userId, createdAt: new Date(), resolvedAt: null, resolvedBy: null, messages: [] })
    await this.reply(id, value.body, userId)
    return id
  }

  async reply(id: string, body: string, userId: string) {
    this.rows.get(id)!.messages.push({ id: uuidv7(), body, author: { id: userId, name: 'Member', email: `${userId}@example.invalid`, avatar: null }, createdAt: new Date() })
  }

  async resolve(id: string, resolved: boolean, userId: string) {
    Object.assign(this.rows.get(id)!, { resolvedAt: resolved ? new Date() : null, resolvedBy: resolved ? userId : null })
  }

  async delete(id: string) {
    this.rows.delete(id)
  }
}
function fixture() {
  const pages = new MemoryPages()
  const workspaces = new WorkspaceService(new MemoryWorkspaces())
  const pageService = new PageService(pages, pages, workspaces, new FolderService(new MemoryFolders(), workspaces))
  const repository = new MemoryComments()
  const published: string[] = []
  const events = { async commentsChanged(id: string) {
    published.push(id)
  } }
  return { published, service: new CommentService(repository, pageService, workspaces, events), repository, pages, workspaces, pageId: pages.page.id }
}

describe('text comment discussions', () => {
  test('members create, reply, resolve and reopen with public author information', async () => {
    const { service, pageId } = fixture()
    const thread = await service.create(pageId, input, OWNER_ID)
    expect(thread.anchor).toEqual(input.anchor)
    expect(thread.createdAt).toBeString()
    expect(thread.messages[0]?.author.id).toBe(OWNER_ID)
    const reply = await service.reply(pageId, thread.id, 'Here is more context.', EDITOR_ID)
    expect(reply.messages).toHaveLength(2)
    expect(reply.messages[1]?.author.id).toBe(EDITOR_ID)
    expect((await service.resolve(pageId, thread.id, true, EDITOR_ID)).resolvedBy).toBe(EDITOR_ID)
    await expect(service.reply(pageId, thread.id, 'Blocked', OWNER_ID)).rejects.toMatchObject({ statusCode: 409 })
    expect((await service.resolve(pageId, thread.id, false, OWNER_ID)).resolvedAt).toBeNull()
    expect((await service.reply(pageId, thread.id, 'Reopened', EDITOR_ID)).messages).toHaveLength(3)
  })

  test('publishes committed mutations only, including deletion, to the page room', async () => {
    const { service, published, repository, pageId } = fixture()
    const thread = await service.create(pageId, input, OWNER_ID)
    expect(repository.rows.has(thread.id)).toBe(true)
    expect(published).toEqual([pageId])
    await service.reply(pageId, thread.id, 'A reply', EDITOR_ID)
    await service.resolve(pageId, thread.id, true, OWNER_ID)
    await expect(service.reply(pageId, thread.id, 'Rejected', EDITOR_ID)).rejects.toMatchObject({ statusCode: 409 })
    await expect(service.delete(pageId, thread.id, EDITOR_ID)).rejects.toMatchObject({ statusCode: 403 })
    expect(published).toHaveLength(3)
    await service.delete(pageId, thread.id, OWNER_ID)
    expect(repository.rows.has(thread.id)).toBe(false)
    expect(published).toEqual([pageId, pageId, pageId, pageId])
  })

  test('outsiders cannot list, create, read through mutations or delete discussions', async () => {
    const { service, pageId } = fixture()
    const thread = await service.create(pageId, input, OWNER_ID)
    for (const action of [() => service.list(pageId, 'outsider'), () => service.create(pageId, input, 'outsider'),
      () => service.reply(pageId, thread.id, 'Injected', 'outsider'), () => service.resolve(pageId, thread.id, true, 'outsider'),
      () => service.delete(pageId, thread.id, 'outsider')]) {
      await expect(action()).rejects.toMatchObject({ statusCode: 404 })
    }
  })

  test('a thread cannot be accessed through a different page or deleted by another regular member', async () => {
    const { service, pageId, pages } = fixture()
    const thread = await service.create(pageId, input, OWNER_ID)
    await expect(service.delete(pageId, thread.id, EDITOR_ID)).rejects.toMatchObject({ statusCode: 403 })
    const originalId = pages.page.id
    pages.page.id = uuidv7()
    await expect(service.reply(pages.page.id, thread.id, 'Injected', OWNER_ID)).rejects.toMatchObject({ statusCode: 404 })
    pages.page.id = originalId
    await service.delete(pageId, thread.id, OWNER_ID)
    expect(await service.list(pageId, OWNER_ID)).toEqual([])
  })

  test('creators can delete their own discussion and managers can moderate it', async () => {
    const { service, pageId } = fixture()
    const first = await service.create(pageId, input, EDITOR_ID)
    await service.delete(pageId, first.id, EDITOR_ID)
    const second = await service.create(pageId, input, EDITOR_ID)
    await service.delete(pageId, second.id, OWNER_ID)
    expect(await service.list(pageId, EDITOR_ID)).toEqual([])
  })

  test('membership revocation and page deletion protect previously accessible discussions', async () => {
    const { service, pageId, workspaces, pages } = fixture()
    const thread = await service.create(pageId, input, EDITOR_ID)
    await workspaces.removeMember(WORKSPACE_ID, EDITOR_ID, OWNER_ID)
    await expect(service.list(pageId, EDITOR_ID)).rejects.toMatchObject({ statusCode: 404 })
    await expect(service.reply(pageId, thread.id, 'Revoked', EDITOR_ID)).rejects.toMatchObject({ statusCode: 404 })
    await pages.delete(pageId)
    await expect(service.list(pageId, OWNER_ID)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('comment request validation', () => {
  test('trims plain text and rejects empty, oversized, spoofed and malformed input', () => {
    expect(commentBodySchema.parse({ body: '  A reply  ' })).toEqual({ body: 'A reply' })
    expect(commentThreadSchema.parse(input)).toEqual(input)
    for (const value of [{ ...input, body: ' ' }, { ...input, body: 'x'.repeat(5001) }, { ...input, quote: ' ' },
      { ...input, authorId: OWNER_ID }, { ...input, anchor: { from: { type: { client: -1, clock: 0 } }, to: {} } },
      { ...input, anchor: { from: { type: { client: 1, clock: 0 }, tname: 'default' }, to: input.anchor.to } }]) {
      expect(commentThreadSchema.safeParse(value).success).toBe(false)
    }
    expect(commentResolutionSchema.safeParse({ resolved: true, resolvedBy: OWNER_ID }).success).toBe(false)
  })
})
