import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { conversations, conversationMessages } from '../../../platform/database/schema'
import type { ConversationRepository } from '../domain/ConversationRepository'
import type { KnowledgeAnswer } from '../../../../shared/kernel/library'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class MySqlConversationRepository implements ConversationRepository {
  constructor(private readonly db: Database) { }
  private owner(workspaceId: string, userId: string, id?: string) {
    return and(eq(conversations.workspaceId, workspaceId), eq(conversations.userId, userId), id ? eq(conversations.id, id) : undefined)
  }

  async list(workspaceId: string, userId: string) {
    return (await this.db.select().from(conversations).where(this.owner(workspaceId, userId)).orderBy(desc(conversations.updatedAt), desc(conversations.id))).map(row => ({ id: row.id, title: row.title, updatedAt: row.updatedAt.toISOString(), revision: row.revision }))
  }

  async create(workspaceId: string, userId: string) {
    const row = { id: crypto.randomUUID(), workspaceId, userId, title: 'New conversation', revision: 0, updatedAt: new Date() }
    await this.db.insert(conversations).values(row)
    return { id: row.id, title: row.title, revision: 0, updatedAt: row.updatedAt.toISOString() }
  }

  async find(workspaceId: string, userId: string, id: string) {
    const [row] = await this.db.select().from(conversations).where(this.owner(workspaceId, userId, id))
    if (!row) {
      return null
    }
    const messages = await this.db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, id)).orderBy(conversationMessages.id)
    return { id, title: row.title, revision: row.revision, updatedAt: row.updatedAt.toISOString(), messages: messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString() })) }
  }

  async rename(workspaceId: string, userId: string, id: string, title: string) {
    const [result] = await this.db.update(conversations).set({ title, updatedAt: new Date() }).where(this.owner(workspaceId, userId, id))
    return result.affectedRows > 0
  }

  async remove(workspaceId: string, userId: string, id: string) {
    const [result] = await this.db.delete(conversations).where(this.owner(workspaceId, userId, id))
    return result.affectedRows > 0
  }

  async append(workspaceId: string, userId: string, id: string, revision: number, question: string, answer: KnowledgeAnswer) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(conversations).where(this.owner(workspaceId, userId, id)).for('update')
      if (!row) {
        throw new ApplicationError('not_found', 'Conversation not found')
      }
      if (row.revision !== revision) {
        throw new ApplicationError('conflict', 'This conversation changed in another tab. Reload before sending again.')
      }
      if (row.revision >= 100) {
        throw new ApplicationError('invalid_input', 'Start a new conversation after 100 questions')
      }
      const { uuidv7 } = await import('uuidv7')
      await tx.insert(conversationMessages).values([
        { id: uuidv7(), conversationId: id, role: 'user', content: question, sources: [] },
        { id: uuidv7(), conversationId: id, role: 'assistant', content: answer.answer, sources: answer.sources }
      ])
      await tx.update(conversations).set({ revision: row.revision + 1, updatedAt: new Date(), ...(row.revision === 0 && row.title === 'New conversation' ? { title: question.slice(0, 120) } : {}) }).where(eq(conversations.id, id))
    })
  }
}
