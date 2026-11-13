import { describe, expect, test } from 'bun:test'
import { lineDiff } from '../../app/features/recovery/utils/lineDiff'
import { movedPageAccess } from '../../server/features/access/domain/movePolicy'

describe('version comparisons', () => {
  test('diff reconstructs both documents, including repeated and blank lines', () => {
    for (const [before, after] of [['a\nb\na\n', 'a\nc\na\n'], ['', 'hello'], ['hello', ''], ['same', 'same']]) {
      const lines = lineDiff(before!, after!)
      expect(lines.filter(line => line.kind !== 'add').map(line => line.text).join('\n')).toBe(before!)
      expect(lines.filter(line => line.kind !== 'remove').map(line => line.text).join('\n')).toBe(after!)
    }
  })
  test('large replacements have bounded work without dropping document lines', () => {
    const before = Array.from({ length: 1000 }, (_, i) => `old ${i}`).join('\n')
    const after = Array.from({ length: 1000 }, (_, i) => `new ${i}`).join('\n')
    const lines = lineDiff(before, after)
    expect(lines.filter(line => line.kind === 'remove')).toHaveLength(1000)
    expect(lines.filter(line => line.kind === 'add')).toHaveLength(1000)
  })
})
describe('moving page permissions', () => {
  const now = new Date(), page = { mode: 'inherit' as const, grants: [] }
  const subject = { id: 'member', role: 'member' as const, suspended: false, groupIds: [] }
  test('moving into a restricted folder reduces inherited access; moving out broadens it', () => {
    expect(movedPageAccess(subject, page, null, now)).toBe('edit')
    expect(movedPageAccess(subject, page, { mode: 'restricted', grants: [] }, now)).toBe('none')
    expect(movedPageAccess({ ...subject, role: 'viewer' }, page, null, now)).toBe('view')
    expect(movedPageAccess({ ...subject, role: 'owner' }, page, { mode: 'restricted', grants: [] }, now)).toBe('edit')
  })
  test('page overrides and suspended membership still apply after moving', () => {
    const denied = { mode: 'inherit' as const, grants: [{ id: 'g', memberId: 'member', groupId: null, level: 'none' as const, expiresAt: null }] }
    expect(movedPageAccess(subject, denied, null, now)).toBe('none')
    expect(movedPageAccess({ ...subject, suspended: true }, page, null, now)).toBe('none')
  })
})
test('AI follow-up answers retain source dependencies and redact after revocation', async () => {
  const { ConversationService } = await import('../../server/features/conversations/application/ConversationService')
  type Dependencies = ConstructorParameters<typeof ConversationService>
  const oldSource = { id: 'original', title: 'Original', workspaceId: 'workspace' }
  const newSource = { id: 'new', title: 'New', workspaceId: 'workspace' }
  let visible = [oldSource, newSource]
  let detail = {
    id: 'chat', title: 'Chat', updatedAt: new Date().toISOString(), revision: 1,
    messages: [{ id: 'answer', role: 'assistant' as const, content: 'A prior sensitive answer', sources: [oldSource], createdAt: new Date().toISOString() }]
  }
  const repository = {
    find: async () => detail,
    append: async (_workspace: string, _user: string, _id: string, _revision: number, _question: string, answer: { answer: string, sources: typeof visible }) => {
      detail = { ...detail, revision: 2, messages: [...detail.messages, { id: 'followup', role: 'assistant', content: answer.answer, sources: answer.sources, createdAt: new Date().toISOString() }] }
    }
  } as unknown as Dependencies[0]
  const access = { requireMember: async () => ({}) } as unknown as Dependencies[1]
  const resources = { visible: async () => visible } as unknown as Dependencies[2]
  const questions = { answer: async () => ({ answer: 'A follow-up using earlier context', sources: [newSource] }) } as unknown as Dependencies[3]
  const service = new ConversationService(repository, access, resources, questions)
  const result = await service.ask('workspace', 'user', 'chat', 'Follow-up', 1)
  expect(result.messages.at(-1)?.sources.map(source => source.id)).toEqual(['new', 'original'])
  visible = [newSource]
  const redacted = await service.get('workspace', 'user', 'chat')
  expect(redacted.messages.every(message => message.unavailable && !message.sources.length && !message.content.includes('sensitive'))).toBe(true)
})
