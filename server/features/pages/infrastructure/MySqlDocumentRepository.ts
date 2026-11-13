import { appendWorkspaceActivity } from '../../settings/infrastructure/MySqlWorkspaceJournal'
import { and, desc, eq, inArray, isNull, isNotNull } from 'drizzle-orm'
import { needsSnapshot } from '../../recovery/domain/snapshotPolicy'
import { savePageSnapshot } from '../../../platform/database/pageSnapshots'
import type { Clock } from '../../../core/ports/Clock'
import * as Y from 'yjs'
import { yDocToProsemirrorJSON } from 'y-prosemirror'
import type { Database } from '../../../platform/database/client'
import { documents, pageLinks, pageMentions, pages, pageVersions, workspaceMembers } from '../../../platform/database/schema'
import type { DocumentRepository } from '../domain/DocumentRepository'
import type { ActivityPublisher } from '../../notifications/domain/ActivityPublisher'
import { documentLinks } from '../../library/domain/documentLinks'

interface DocumentNode { type?: string, attrs?: Record<string, unknown>, content?: DocumentNode[] }
function mentionedUsers(state: Uint8Array): string[] {
  const document = new Y.Doc()
  try {
    Y.applyUpdate(document, state)
    const ids = new Set<string>()
    const visit = (node: DocumentNode) => {
      if (node.type === 'mention' && typeof node.attrs?.id === 'string') {
        ids.add(node.attrs.id)
      }
      node.content?.forEach(visit)
    }
    visit(yDocToProsemirrorJSON(document, 'default') as DocumentNode)
    return [...ids]
  } finally {
    document.destroy()
  }
}
export class MySqlDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Database, private readonly activity: ActivityPublisher, private readonly clock: Clock, private readonly changed: (id: string) => void) {}
  async readContent(id: string): Promise<string> {
    const [document] = await this.db.select({ markdown: documents.markdown }).from(documents).where(eq(documents.pageId, id)).limit(1)
    return document?.markdown || ''
  }

  async readState(id: string): Promise<Uint8Array | null> {
    const [document] = await this.db.select({ state: documents.state }).from(documents).where(eq(documents.pageId, id)).limit(1)
    return document?.state ? new Uint8Array(document.state) : null
  }

  async saveState(id: string, state: Uint8Array, markdown: string, userId?: string, checkpoint = false): Promise<void> {
    const snapshot = Buffer.from(state)
    const mentions = mentionedUsers(state)
    const newMentions = await this.db.transaction(async (transaction) => {
      const [page] = await transaction.select().from(pages).where(eq(pages.id, id)).limit(1).for('update')
      if (!page) {
        return []
      }
      const [previous] = await transaction.select().from(documents).where(eq(documents.pageId, id)).limit(1)
      if (previous && previous.markdown !== markdown) {
        const [latest] = await transaction.select({ createdAt: pageVersions.createdAt }).from(pageVersions).where(eq(pageVersions.pageId, id)).orderBy(desc(pageVersions.createdAt)).limit(1)
        if (needsSnapshot(previous.markdown, markdown, latest?.createdAt ?? null, this.clock.now(), checkpoint)) {
          await savePageSnapshot(transaction, id, previous.markdown, userId ?? null)
          if (userId) {
            await appendWorkspaceActivity(transaction, page.workspaceId, userId, 'page.updated', `${page.title} (document)`, { pageId: id })
          }
        }
      }
      await transaction.insert(documents).values({ pageId: id, markdown, state: snapshot }).onDuplicateKeyUpdate({ set: { state: snapshot, markdown } })
      await transaction.update(pages).set({ updatedAt: this.clock.now() }).where(eq(pages.id, id))
      await transaction.delete(pageLinks).where(eq(pageLinks.sourceId, id))
      const targets = documentLinks(markdown).filter(target => target !== id)
      if (targets.length) {
        const valid = await transaction.select({ id: pages.id }).from(pages).where(and(eq(pages.workspaceId, page.workspaceId), inArray(pages.id, targets)))
        if (valid.length) {
          await transaction.insert(pageLinks).values(valid.map(row => ({ sourceId: id, targetId: row.id })))
        }
      }
      const old = await transaction.select({ userId: pageMentions.userId }).from(pageMentions).where(eq(pageMentions.pageId, id))
      const eligible = mentions.length
        ? await transaction.select({ userId: workspaceMembers.userId }).from(workspaceMembers)
            .where(and(eq(workspaceMembers.workspaceId, page.workspaceId), inArray(workspaceMembers.userId, mentions), isNull(workspaceMembers.suspendedAt), isNotNull(workspaceMembers.userId)))
        : []
      const valid = eligible.filter((row): row is { userId: string } => !!row.userId)
      await transaction.delete(pageMentions).where(eq(pageMentions.pageId, id))
      if (valid.length) {
        await transaction.insert(pageMentions).values(valid.map(row => ({ pageId: id, userId: row.userId })))
      }
      return valid.filter(row => !old.some(previous => previous.userId === row.userId)).map(row => row.userId)
    })
    this.changed(id)
    await this.activity.mentions(id, newMentions, userId)
  }
}
