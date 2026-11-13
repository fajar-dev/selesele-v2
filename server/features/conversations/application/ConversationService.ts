import type { ConversationRepository } from '../domain/ConversationRepository'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { ResourceAccess } from '../../access/domain/ResourceAccess'
import type { WorkspaceQuestionService } from '../../writing/application/WorkspaceQuestionService'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class ConversationService {
  constructor(private readonly repository: ConversationRepository, private readonly access: WorkspaceAuthorization, private readonly resources: ResourceAccess, private readonly questions: WorkspaceQuestionService) {
  }

  async list(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    return this.repository.list(workspaceId, userId)
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

  async remove(workspaceId: string, userId: string, id: string) {
    await this.access.requireMember(workspaceId, userId)
    if (!await this.repository.remove(workspaceId, userId, id)) {
      throw new ApplicationError('not_found', 'Conversation not found')
    }
  }

  async ask(workspaceId: string, userId: string, id: string, question: string, revision: number) {
    const conversation = await this.get(workspaceId, userId, id)
    if (conversation.revision !== revision) {
      throw new ApplicationError('conflict', 'Conversation changed. Reload before sending again.')
    }
    const history = conversation.messages.filter(message => !message.unavailable).slice(-8)
    const answer = await this.questions.answer(userId, question, workspaceId, history)
    // Follow-up output can depend on any earlier answer included in its prompt.
    // Retain that provenance so later source revocation redacts dependent answers too.
    answer.sources = [...new Map([...answer.sources, ...history.flatMap(message => message.sources)].map(source => [source.id, source])).values()]
    await this.access.requireMember(workspaceId, userId)
    const allowed = new Set((await this.resources.visible('item', workspaceId, userId)).map(item => item.id))
    if (answer.sources.some(source => !allowed.has(source.id))) {
      throw new ApplicationError('forbidden', 'Source access changed while preparing this answer')
    }
    await this.repository.append(workspaceId, userId, id, revision, question, answer)
    return this.get(workspaceId, userId, id)
  }
}
