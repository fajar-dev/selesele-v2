import { and, asc, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { CommentRepository } from '../domain/CommentRepository'
import type { CommentThread } from '../domain/CommentThread'
import type { CommentThreadInput } from '../../../../shared/contracts/comment'
import type { Database } from '../../../platform/database/client'
import { comments, commentThreads, users } from '../../../platform/database/schema'

export class MySqlCommentRepository implements CommentRepository {
  constructor(private readonly db: Database) {
  }

  async list(itemId: string): Promise<CommentThread[]> {
    const rows = await this.db.select().from(commentThreads).where(eq(commentThreads.itemId, itemId)).orderBy(asc(commentThreads.createdAt), asc(commentThreads.id))
    return this.withMessages(rows)
  }

  async find(itemId: string, threadId: string): Promise<CommentThread | null> {
    const rows = await this.db.select().from(commentThreads).where(and(eq(commentThreads.id, threadId), eq(commentThreads.itemId, itemId))).limit(1)
    return (await this.withMessages(rows))[0] || null
  }

  private async withMessages(rows: Omit<CommentThread, 'messages'>[]): Promise<CommentThread[]> {
    if (!rows.length) {
      return []
    }
    const messages = await this.db.select({
      id: comments.id, threadId: comments.threadId, body: comments.body, createdAt: comments.createdAt,
      author: { id: users.id, name: users.name, email: users.email, avatar: users.avatar }
    }).from(comments).innerJoin(users, eq(comments.authorId, users.id))
      .where(inArray(comments.threadId, rows.map(row => row.id))).orderBy(asc(comments.createdAt), asc(comments.id))
    const grouped = new Map<string, CommentThread['messages']>()
    for (const { threadId, ...message } of messages) {
      const group = grouped.get(threadId) || []
      group.push(message)
      grouped.set(threadId, group)
    }
    return rows.map(row => ({ ...row, messages: grouped.get(row.id) || [] }))
  }

  async create(itemId: string, input: CommentThreadInput, userId: string): Promise<string> {
    const id = uuidv7()
    await this.db.transaction(async (transaction) => {
      await transaction.insert(commentThreads).values({ id, itemId, quote: input.quote, anchor: input.anchor, createdBy: userId })
      await transaction.insert(comments).values({ threadId: id, body: input.body, authorId: userId })
    })
    return id
  }

  async reply(threadId: string, body: string, userId: string): Promise<void> {
    await this.db.insert(comments).values({ threadId, body, authorId: userId })
  }

  async resolve(threadId: string, resolved: boolean, userId: string): Promise<void> {
    await this.db.update(commentThreads).set({ resolvedAt: resolved ? new Date() : null, resolvedBy: resolved ? userId : null }).where(eq(commentThreads.id, threadId))
  }

  async delete(threadId: string): Promise<void> {
    await this.db.delete(commentThreads).where(eq(commentThreads.id, threadId))
  }
}
