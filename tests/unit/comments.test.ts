import { MemoryResourceAccess, MemoryJournal, silentActivity, MemoryItems, MemoryWorkspaces, MemoryFolders, OWNER_ID, EDITOR_ID } from '../support/fakes'
import { WorkspaceAccessPolicy } from '../../server/features/workspaces/application/WorkspaceAccessPolicy'
import { describe, expect, test } from 'bun:test'
import { uuidv7 } from 'uuidv7'
import { CommentService } from '../../server/features/comments/application/CommentService'
import { ItemService } from '../../server/features/items/application/ItemService'
import { FolderService } from '../../server/features/workspaces/application/FolderService'
import type { CommentRepository } from '../../server/features/comments/domain/CommentRepository'
import type { CommentThread } from '../../server/features/comments/domain/CommentThread'
import type { CommentThreadInput } from '../../shared/contracts/comment'
import { commentThreadSchema, commentBodySchema, commentResolutionSchema } from '../../shared/validation/comment'

const input: CommentThreadInput = { body: 'Please clarify this.', quote: 'Shared text', anchor: {
  from: { type: { client: 123, clock: 1 }, item: { client: 123, clock: 2 }, assoc: 0 },
  to: { type: { client: 123, clock: 1 }, item: { client: 123, clock: 12 }, assoc: 0 }
} }
class MemoryComments implements CommentRepository {
  rows = new Map<string, CommentThread>()
  async list(itemId: string) {
    return [...this.rows.values()].filter(row => row.itemId === itemId)
  }

  async find(itemId: string, id: string) {
    return this.rows.get(id)?.itemId === itemId ? this.rows.get(id)! : null
  }

  async create(itemId: string, value: CommentThreadInput, userId: string) {
    const id = uuidv7()
    this.rows.set(id, { id, itemId, quote: value.quote, anchor: value.anchor, createdBy: userId, createdAt: new Date(), resolvedAt: null, resolvedBy: null, messages: [] })
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
  const items = new MemoryItems()
  const repositoryAccess = new MemoryWorkspaces()
  const access = new WorkspaceAccessPolicy(repositoryAccess)
  const members = repositoryAccess
  const itemService = new ItemService(items, access, new FolderService(new MemoryFolders(), access, new MemoryJournal(), new MemoryResourceAccess()), new MemoryJournal(), new MemoryResourceAccess(items))
  const repository = new MemoryComments()
  const published: string[] = []
  const events = { async commentsChanged(id: string) {
    published.push(id)
  } }
  return { published, service: new CommentService(repository, itemService, access, events, silentActivity), repository, items, members, itemId: items.item.id }
}
describe('text comment discussions', () => {
  test('members create, reply, resolve and reopen with public author information', async () => {
    const { service, itemId } = fixture()
    const thread = await service.create(itemId, input, OWNER_ID)
    expect(thread.anchor).toEqual(input.anchor)
    expect(thread.createdAt).toBeString()
    expect(thread.messages[0]?.author.id).toBe(OWNER_ID)
    const reply = await service.reply(itemId, thread.id, 'Here is more context.', EDITOR_ID)
    expect(reply.messages).toHaveLength(2)
    expect(reply.messages[1]?.author.id).toBe(EDITOR_ID)
    expect((await service.resolve(itemId, thread.id, true, EDITOR_ID)).resolvedBy).toBe(EDITOR_ID)
    await expect(service.reply(itemId, thread.id, 'Blocked', OWNER_ID)).rejects.toMatchObject({ code: 'conflict' })
    expect((await service.resolve(itemId, thread.id, false, OWNER_ID)).resolvedAt).toBeNull()
    expect((await service.reply(itemId, thread.id, 'Reopened', EDITOR_ID)).messages).toHaveLength(3)
  })
  test('publishes committed mutations only, including deletion, to the item room', async () => {
    const { service, published, repository, itemId } = fixture()
    const thread = await service.create(itemId, input, OWNER_ID)
    expect(repository.rows.has(thread.id)).toBe(true)
    expect(published).toEqual([itemId])
    await service.reply(itemId, thread.id, 'A reply', EDITOR_ID)
    await service.resolve(itemId, thread.id, true, OWNER_ID)
    await expect(service.reply(itemId, thread.id, 'Rejected', EDITOR_ID)).rejects.toMatchObject({ code: 'conflict' })
    await expect(service.delete(itemId, thread.id, EDITOR_ID)).rejects.toMatchObject({ code: 'forbidden' })
    expect(published).toHaveLength(3)
    await service.delete(itemId, thread.id, OWNER_ID)
    expect(repository.rows.has(thread.id)).toBe(false)
    expect(published).toEqual([itemId, itemId, itemId, itemId])
  })
  test('outsiders cannot list, create, read through mutations or delete discussions', async () => {
    const { service, itemId } = fixture()
    const thread = await service.create(itemId, input, OWNER_ID)
    for (const action of [() => service.list(itemId, 'outsider'), () => service.create(itemId, input, 'outsider'),
      () => service.reply(itemId, thread.id, 'Injected', 'outsider'), () => service.resolve(itemId, thread.id, true, 'outsider'),
      () => service.delete(itemId, thread.id, 'outsider')]) {
      await expect(action()).rejects.toMatchObject({ code: 'not_found' })
    }
  })
  test('a thread cannot be accessed through a different item or deleted by another regular member', async () => {
    const { service, itemId, items } = fixture()
    const thread = await service.create(itemId, input, OWNER_ID)
    await expect(service.delete(itemId, thread.id, EDITOR_ID)).rejects.toMatchObject({ code: 'forbidden' })
    const originalId = items.item.id
    items.item.id = uuidv7()
    await expect(service.reply(items.item.id, thread.id, 'Injected', OWNER_ID)).rejects.toMatchObject({ code: 'not_found' })
    items.item.id = originalId
    await service.delete(itemId, thread.id, OWNER_ID)
    expect(await service.list(itemId, OWNER_ID)).toEqual([])
  })
  test('creators can delete their own discussion and managers can moderate it', async () => {
    const { service, itemId } = fixture()
    const first = await service.create(itemId, input, EDITOR_ID)
    await service.delete(itemId, first.id, EDITOR_ID)
    const second = await service.create(itemId, input, EDITOR_ID)
    await service.delete(itemId, second.id, OWNER_ID)
    expect(await service.list(itemId, EDITOR_ID)).toEqual([])
  })
  test('membership revocation and item deletion protect previously accessible discussions', async () => {
    const { service, itemId, members, items } = fixture()
    const thread = await service.create(itemId, input, EDITOR_ID)
    members.membership.delete(EDITOR_ID)
    await expect(service.list(itemId, EDITOR_ID)).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.reply(itemId, thread.id, 'Revoked', EDITOR_ID)).rejects.toMatchObject({ code: 'not_found' })
    await items.delete(itemId)
    await expect(service.list(itemId, OWNER_ID)).rejects.toMatchObject({ code: 'not_found' })
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
