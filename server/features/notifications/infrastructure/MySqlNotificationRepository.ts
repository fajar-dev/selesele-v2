import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { enqueueEmail } from '../../mail/infrastructure/enqueueEmail'
import { emailExcerpt } from '../../mail/domain/EmailActivity'
import { and, desc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Database, DatabaseTransaction } from '../../../platform/database/client'
import { comments, commentThreads, documents, folders, notifications, items, users, workspaceMembers, workspaces } from '../../../platform/database/schema'
import type { NotificationRepository } from '../domain/NotificationRepository'

export class MySqlNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Database, private readonly emailEnabled: boolean) {
  }

  private async actorName(userId?: string): Promise<string> {
    if (!userId) {
      return 'A workspace member'
    }
    const [actor] = await this.db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    return actor?.name || actor?.email || 'A workspace member'
  }

  private async email(transaction: DatabaseTransaction, message: Parameters<typeof enqueueEmail>[1]): Promise<void> {
    if (this.emailEnabled) {
      await enqueueEmail(transaction, message)
    }
  }

  async list(userId: string) {
    const scope = await loadResourceScope(this.db, userId)
    const visible = scope.allowed('item')
    const rows = await this.db.select({ id: notifications.id, kind: notifications.kind, title: notifications.title, workspaceId: notifications.workspaceId,
      itemId: notifications.itemId, threadId: notifications.threadId, readAt: notifications.readAt, createdAt: notifications.createdAt }).from(notifications)
      .innerJoin(workspaces, eq(workspaces.id, notifications.workspaceId)).innerJoin(users, eq(users.id, notifications.userId))
      .leftJoin(workspaceMembers, and(eq(workspaceMembers.workspaceId, workspaces.id), eq(workspaceMembers.userId, userId)))
      .leftJoin(items, eq(items.id, notifications.itemId)).leftJoin(folders, eq(folders.id, items.folderId))
      .where(and(eq(notifications.userId, userId), isNull(workspaces.deletedAt), isNotNull(workspaceMembers.id), isNull(workspaceMembers.suspendedAt), or(and(eq(notifications.kind, 'invitation'), isNull(notifications.itemId)), visible.length ? inArray(notifications.itemId, visible) : undefined))).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(100)
    return rows.map(row => ({ ...row, readAt: row.readAt?.toISOString() || null, createdAt: row.createdAt.toISOString() }))
  }

  async read(userId: string, id?: string) {
    await this.db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), id ? eq(notifications.id, id) : undefined))
  }

  async comment(itemId: string, threadId: string, body: string, actorId: string, event: 'comment' | 'reply' = 'reply') {
    const [item] = await this.db.select({ workspaceId: items.workspaceId, title: items.title, createdBy: items.createdBy, workspaceName: workspaces.name }).from(items)
      .innerJoin(workspaces, eq(workspaces.id, items.workspaceId)).where(eq(items.id, itemId)).limit(1)
    if (!item) {
      return []
    }
    const participants = await this.db.select({ id: comments.authorId }).from(comments).where(eq(comments.threadId, threadId))
    const [thread] = await this.db.select({ id: commentThreads.createdBy, quote: commentThreads.quote }).from(commentThreads).where(eq(commentThreads.id, threadId))
    const actorName = await this.actorName(actorId)
    const emails = [...body.matchAll(/@([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)].map(match => match[1]!.toLowerCase())
    const members = await this.db.select({ id: users.id, email: users.email }).from(users)
      .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id)).where(and(eq(workspaceMembers.workspaceId, item.workspaceId), isNull(workspaceMembers.suspendedAt)))
    const ids = new Set([item.createdBy, ...participants.map(row => row.id), ...(thread ? [thread.id] : [])])
    const recipients: string[] = []
    const eventId = uuidv7()
    await this.db.transaction(async (transaction) => {
      for (const member of members) {
        const mention = emails.includes(member.email.toLowerCase())
        if (member.id === actorId || (!mention && !ids.has(member.id))) {
          continue
        }
        if (!(await loadResourceScope(transaction, member.id, item.workspaceId)).allowed('item').includes(itemId)) {
          continue
        }
        const kind = mention ? 'mention' : event
        const title = `${mention ? 'You were mentioned' : event === 'comment' ? 'New comment' : 'New reply'} in ${item.title}`
        const deduplicationKey = `${eventId}:${member.id}`
        await transaction.insert(notifications).values({ userId: member.id, workspaceId: item.workspaceId, itemId, threadId, kind, title, deduplicationKey })
        await this.email(transaction, { recipient: member.email, recipientUserId: member.id, workspaceId: item.workspaceId, itemId, kind, title, deduplicationKey,
          activity: { actorName, workspaceName: item.workspaceName, itemTitle: item.title, threadId, body: emailExcerpt(body), quote: emailExcerpt(thread?.quote ?? '', 400) } })
        recipients.push(member.id)
      }
    })
    return recipients
  }

  async mentions(itemId: string, userIds: string[], actorId?: string) {
    if (!userIds.length) {
      return []
    }
    const [item] = await this.db.select({ workspaceId: items.workspaceId, title: items.title, description: items.description, workspaceName: workspaces.name }).from(items)
      .innerJoin(workspaces, eq(workspaces.id, items.workspaceId)).where(eq(items.id, itemId)).limit(1)
    if (!item) {
      return []
    }
    const actorName = await this.actorName(actorId)
    const [document] = await this.db.select({ markdown: documents.markdown }).from(documents).where(eq(documents.itemId, itemId)).limit(1)
    const members = await this.db.select({ userId: users.id, email: users.email, name: users.name }).from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId)).where(and(eq(workspaceMembers.workspaceId, item.workspaceId), inArray(workspaceMembers.userId, userIds), isNull(workspaceMembers.suspendedAt)))
    const recipients: string[] = []
    const event = uuidv7()
    await this.db.transaction(async (transaction) => {
      for (const member of members) {
        if (member.userId === actorId) {
          continue
        }
        if (!(await loadResourceScope(transaction, member.userId, item.workspaceId)).allowed('item').includes(itemId)) {
          continue
        }
        const title = `You were mentioned in ${item.title}`
        const deduplicationKey = `mention:${event}:${member.userId}`
        const blocks = (document?.markdown || item.description).split(/\n\s*\n/)
        const mentioned = blocks.find(block => [member.name, member.email, member.userId].some(label => label && block.toLowerCase().includes(`@${label.toLowerCase()}`)))
        await transaction.insert(notifications).values({ userId: member.userId, workspaceId: item.workspaceId, itemId, kind: 'mention', title, deduplicationKey })
        await this.email(transaction, { recipient: member.email, recipientUserId: member.userId, workspaceId: item.workspaceId, itemId, kind: 'mention', title, deduplicationKey,
          activity: { actorName, workspaceName: item.workspaceName, itemTitle: item.title, body: emailExcerpt(mentioned || document?.markdown || item.description) } })
        recipients.push(member.userId)
      }
    })
    return recipients
  }
}
