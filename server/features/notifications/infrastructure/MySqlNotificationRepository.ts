import { and, desc, eq, gt, inArray, isNotNull, isNull, or } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Database } from '../../../platform/database/client'
import { comments, commentThreads, folders, notifications, pages, users, workspaceInvitations, workspaceMembers, workspaces } from '../../../platform/database/schema'
import type { NotificationRepository } from '../domain/NotificationRepository'

export class MySqlNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Database) {}
  async list(userId: string) {
    const pending = await this.db.select({ workspaceId: workspaces.id, title: workspaces.name }).from(workspaceInvitations)
      .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId)).innerJoin(users, eq(users.email, workspaceInvitations.email))
      .where(and(eq(users.id, userId), isNull(workspaces.deletedAt), gt(workspaceInvitations.expiresAt, new Date())))
    if (pending.length) {
      await this.db.insert(notifications).values(pending.map(item => ({ userId, workspaceId: item.workspaceId, kind: 'invitation' as const, title: `You’re invited to ${item.title}`, deduplicationKey: `invite:${item.workspaceId}` })))
        .onDuplicateKeyUpdate({ set: { userId } })
    }
    const rows = await this.db.select({ id: notifications.id, kind: notifications.kind, title: notifications.title, workspaceId: notifications.workspaceId,
      pageId: notifications.pageId, readAt: notifications.readAt, createdAt: notifications.createdAt }).from(notifications)
      .innerJoin(workspaces, eq(workspaces.id, notifications.workspaceId)).innerJoin(users, eq(users.id, notifications.userId))
      .leftJoin(workspaceMembers, and(eq(workspaceMembers.workspaceId, workspaces.id), eq(workspaceMembers.userId, userId)))
      .leftJoin(pages, eq(pages.id, notifications.pageId)).leftJoin(folders, eq(folders.id, pages.folderId))
      .leftJoin(workspaceInvitations, and(eq(workspaceInvitations.workspaceId, workspaces.id), eq(workspaceInvitations.email, users.email), gt(workspaceInvitations.expiresAt, new Date())))
      .where(and(eq(notifications.userId, userId), isNull(workspaces.deletedAt), or(
        and(eq(notifications.kind, 'invitation'), isNotNull(workspaceInvitations.id)),
        and(isNotNull(workspaceMembers.id), isNull(pages.deletedAt), isNull(folders.deletedAt))
      ))).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(100)
    return rows.map(row => ({ ...row, readAt: row.readAt?.toISOString() || null, createdAt: row.createdAt.toISOString() }))
  }

  async read(userId: string, id?: string) {
    await this.db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), id ? eq(notifications.id, id) : undefined))
  }

  async invitation(workspaceId: string, email: string, actorId: string) {
    const [recipient] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    const [workspace] = await this.db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, workspaceId))
    if (!recipient || recipient.id === actorId || !workspace) {
      return []
    }
    await this.db.insert(notifications).values({ userId: recipient.id, workspaceId, kind: 'invitation', title: `You’re invited to ${workspace.name}`, deduplicationKey: `invite:${workspaceId}` })
      .onDuplicateKeyUpdate({ set: { readAt: null, createdAt: new Date(), title: `You’re invited to ${workspace.name}` } })
    return [recipient.id]
  }

  async comment(pageId: string, threadId: string, body: string, actorId: string) {
    const [page] = await this.db.select().from(pages).where(eq(pages.id, pageId)).limit(1)
    if (!page) {
      return []
    }
    const participants = await this.db.select({ id: comments.authorId }).from(comments).where(eq(comments.threadId, threadId))
    const [thread] = await this.db.select({ id: commentThreads.createdBy }).from(commentThreads).where(eq(commentThreads.id, threadId))
    const emails = [...body.matchAll(/@([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)].map(match => match[1]!.toLowerCase())
    const members = await this.db.select({ id: users.id, email: users.email }).from(users)
      .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id)).where(eq(workspaceMembers.workspaceId, page.workspaceId))
    const ids = new Set([...participants.map(row => row.id), ...(thread ? [thread.id] : [])])
    const recipients: string[] = []
    const event = uuidv7()
    for (const member of members) {
      const mention = emails.includes(member.email.toLowerCase())
      if (member.id === actorId || (!mention && !ids.has(member.id))) {
        continue
      }
      recipients.push(member.id)
      await this.db.insert(notifications).values({ userId: member.id, workspaceId: page.workspaceId, pageId,
        kind: mention ? 'mention' : 'reply', title: `${mention ? 'You were mentioned' : 'New reply'} in ${page.title}`, deduplicationKey: `${event}:${member.id}` })
    }
    return recipients
  }

  async mentions(pageId: string, userIds: string[], actorId?: string) {
    if (!userIds.length) {
      return []
    }
    const [page] = await this.db.select().from(pages).where(eq(pages.id, pageId)).limit(1)
    if (!page) {
      return []
    }
    const members = await this.db.select({ userId: workspaceMembers.userId }).from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, page.workspaceId), inArray(workspaceMembers.userId, userIds)))
    const recipients: string[] = []
    const event = uuidv7()
    for (const member of members) {
      if (member.userId === actorId) {
        continue
      }
      recipients.push(member.userId)
      await this.db.insert(notifications).values({ userId: member.userId, workspaceId: page.workspaceId, pageId, kind: 'mention', title: `You were mentioned in ${page.title}`, deduplicationKey: `mention:${event}:${member.userId}` })
    }
    return recipients
  }
}
