import type { ConversationRepository } from '../domain/ConversationRepository'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { ResourceAccess } from '../../access/domain/ResourceAccess'
import type { WorkspaceQuestionService } from '../../writing/application/WorkspaceQuestionService'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class ConversationService {
  constructor(private readonly repository: ConversationRepository, private readonly access: WorkspaceAuthorization, private readonly resources: ResourceAccess, private readonly questions: WorkspaceQuestionService) {
  }

  async list(workspaceId: string, userId: string, query = '') {
    await this.access.requireMember(workspaceId, userId)
    const rows = await this.repository.list(workspaceId, userId, query.trim())
    if (!query.trim()) {
      return rows
    }
    const needle = query.trim().toLocaleLowerCase()
    const matches = await Promise.all(rows.map(async (row) => {
      if (row.title.toLocaleLowerCase().includes(needle)) {
        return row
      }
      const chat = await this.get(workspaceId, userId, row.id)
      return chat.messages.some(message => !message.unavailable && message.content.toLocaleLowerCase().includes(needle)) ? row : null
    }))
    return matches.filter(row => row !== null)
  }

  async create(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    return this.repository.create(workspaceId, userId)
  }

  async get(workspaceId: string, userId: string, id: string) {
    await this.access.requireMember(workspaceId, userId)
    const conversation = await this.repository.find(workspaceId, userId, id)
    if (!conversation) {
      throw new ApplicationError('not_found', 'Conversation not found')
    }
    const visible = new Map((await this.resources.visible('item', workspaceId, userId)).map(item => [item.id, item]))
    return { ...conversation, messages: conversation.messages.map((message) => {
      if (message.role === 'assistant' && message.sources.some(source => !visible.has(source.id))) {
        return { ...message, content: 'This answer is unavailable because access to one or more source items changed.', sources: [], unavailable: true }
      }
      return { ...message, sources: message.sources.map(source => ({ ...source, title: visible.get(source.id)?.title || source.title })) }
    }) }
  }

  async rename(workspaceId: string, userId: string, id: string, title: string) {
    await this.access.requireMember(workspaceId, userId)
    if (!await this.repository.rename(workspaceId, userId, id, title)) {
      throw new ApplicationError('not_found', 'Conversation not found')
    }
  }

  async pin(workspaceId: string, userId: string, id: string, pinned: boolean) {
    await this.access.requireMember(workspaceId, userId)
    if (!await this.repository.pin(workspaceId, userId, id, pinned)) {
      throw new ApplicationError('not_found', 'Conversation not found')
    }
  }

  async remove(workspaceId: string, userId: string, id: string) {
    await this.access.requireMember(workspaceId, userId)
    if (!await this.repository.remove(workspaceId, userId, id)) {
      throw new ApplicationError('not_found', 'Conversation not found')
    }
  }

  async ask(workspaceId: string, userId: string, id: string, question: string, revision: number, onChunk?: (text: string) => Promise<void>, signal?: AbortSignal) {
    const conversation = await this.get(workspaceId, userId, id)
    if (conversation.revision !== revision) {
      throw new ApplicationError('conflict', 'Conversation changed. Reload before sending again.')
    }
    const history = conversation.messages.filter(message => !message.unavailable).slice(-8)
    const answer = await this.questions.answer(userId, question, workspaceId, history, onChunk, signal, async (ids) => {
      await this.access.requireMember(workspaceId, userId)
      const allowed = new Set((await this.resources.visible('item', workspaceId, userId)).map(item => item.id))
      if ([...ids, ...history.flatMap(message => message.sources.map(source => source.id))].some(id => !allowed.has(id))) {
        throw new ApplicationError('forbidden', 'Source access changed while preparing this answer')
      }
    })
    signal?.throwIfAborted()
    // Follow-up output can depend on any earlier answer included in its prompt.
    // Retain that provenance so later source revocation redacts dependent answers too.
    const provenance = new Map(answer.sources.map(source => [source.id, source]))
    for (const source of history.flatMap(message => message.sources)) {
      if (!provenance.has(source.id)) {
        provenance.set(source.id, source)
      }
    }
    answer.sources = [...provenance.values()]
    await this.access.requireMember(workspaceId, userId)
    const allowed = new Set((await this.resources.visible('item', workspaceId, userId)).map(item => item.id))
    if (answer.sources.some(source => !allowed.has(source.id))) {
      throw new ApplicationError('forbidden', 'Source access changed while preparing this answer')
    }
    signal?.throwIfAborted()
    await this.repository.append(workspaceId, userId, id, revision, question, answer)
    return this.get(workspaceId, userId, id)
  }
}
