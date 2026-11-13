import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { and, desc, eq, isNotNull, isNull, or, sql, inArray } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { canvases, documents, folders, itemActivity, itemLinks, items, workspaceMembers, workspaces } from '../../../platform/database/schema'
import { itemVisibility } from '../../../platform/database/itemVisibility'
import type { LibraryRepository } from '../domain/LibraryRepository'
import type { LibraryEntry } from '../../../../shared/contracts/library'

const body = sql<string>`coalesce(${documents.markdown}, ${canvases.summary}, '')`
const columns = { id: items.id, kind: sql<'item'>`'item'`, workspaceId: items.workspaceId, title: items.title, icon: items.icon, snippet: sql<string>`substring(${body}, 1, 240)` }
const pattern = (value: string) => `%${value.replaceAll('=', '==').replaceAll('%', '=%').replaceAll('_', '=_')}%`
const contains = (column: typeof items.title | typeof documents.markdown | typeof body, value: string) => sql`${column} LIKE ${pattern(value)} ESCAPE '='`
export class MySqlLibraryRepository implements LibraryRepository {
  constructor(private readonly db: Database) {
  }

  private readable(userId: string) {
    return this.db.select(columns).from(items).leftJoin(documents, eq(documents.itemId, items.id)).leftJoin(canvases, eq(canvases.itemId, items.id))
      .innerJoin(workspaces, eq(workspaces.id, items.workspaceId)).innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .leftJoin(folders, eq(folders.id, items.folderId)).where(itemVisibility(userId)).$dynamic()
  }

  async search(userId: string, query: string, workspaceId?: string): Promise<LibraryEntry[]> {
    if (!query.trim()) {
      return []
    }
    const scope = await loadResourceScope(this.db, userId, workspaceId)
    const itemIds = scope.allowed('item')
    const folderIds = scope.allowed('folder')
    const itemRows = itemIds.length
      ? await this.readable(userId).where(and(inArray(items.id, itemIds), itemVisibility(userId), workspaceId ? eq(items.workspaceId, workspaceId) : undefined, or(contains(items.title, query), contains(body, query)))).orderBy(desc(items.updatedAt)).limit(30)
      : []
    const workspaceRows = await this.db.select({ id: workspaces.id, workspaceId: workspaces.id, title: workspaces.name, icon: workspaces.icon, snippet: workspaces.description }).from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id)).where(and(eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt), workspaceId ? eq(workspaces.id, workspaceId) : undefined, sql`${workspaces.name} LIKE ${pattern(query)} ESCAPE '='`)).limit(10)
    const folderRows = folderIds.length
      ? await this.db.select({ id: folders.id, workspaceId: folders.workspaceId, title: folders.name, icon: folders.icon, snippet: folders.description }).from(folders)
          .innerJoin(workspaces, eq(workspaces.id, folders.workspaceId)).innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
          .where(and(inArray(folders.id, folderIds), eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt), isNull(folders.deletedAt), workspaceId ? eq(workspaces.id, workspaceId) : undefined, sql`${folders.name} LIKE ${pattern(query)} ESCAPE '='`)).limit(10)
      : []
    return [...itemRows, ...folderRows.map(row => ({ ...row, kind: 'folder' as const })), ...workspaceRows.map(row => ({ ...row, kind: 'workspace' as const }))]
  }

  async personal(userId: string) {
    const ids = (await loadResourceScope(this.db, userId)).allowed('item')
    if (!ids.length) {
      return { favorites: [], recent: [] }
    }
    const query = () => this.readable(userId).innerJoin(itemActivity, and(eq(itemActivity.itemId, items.id), eq(itemActivity.userId, userId)))
    const [favorites, recent] = await Promise.all([
      query().where(and(inArray(items.id, ids), itemVisibility(userId), isNotNull(itemActivity.favoriteAt))).orderBy(desc(itemActivity.favoriteAt)).limit(100),
      query().where(and(inArray(items.id, ids), itemVisibility(userId), isNotNull(itemActivity.visitedAt))).orderBy(desc(itemActivity.visitedAt)).limit(20)
    ])
    return { favorites, recent }
  }

  async favorite(userId: string, itemId: string, favorite: boolean) {
    const favoriteAt = favorite ? new Date() : null
    await this.db.insert(itemActivity).values({ userId, itemId, favoriteAt }).onDuplicateKeyUpdate({ set: { favoriteAt } })
  }

  async visit(userId: string, itemId: string) {
    const visitedAt = new Date()
    await this.db.insert(itemActivity).values({ userId, itemId, visitedAt }).onDuplicateKeyUpdate({ set: { visitedAt } })
  }

  async backlinks(userId: string, itemId: string) {
    const ids = (await loadResourceScope(this.db, userId)).allowed('item')
    if (!ids.length) {
      return []
    }
    return this.readable(userId).innerJoin(itemLinks, eq(itemLinks.sourceId, items.id))
      .where(and(inArray(items.id, ids), itemVisibility(userId), eq(itemLinks.targetId, itemId))).orderBy(desc(items.updatedAt)).limit(100)
  }

  async context(userId: string, question: string, workspaceId: string) {
    const ids = (await loadResourceScope(this.db, userId, workspaceId)).allowed('item')
    if (!ids.length) {
      return []
    }
    const stop = new Set('the and what where when which how does this that with from about are was for apa siapa kapan mana yang dan dari untuk dengan pada ini itu bagaimana apakah'.split(' '))
    const words = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])].filter(word => word.length > 2 && !stop.has(word)).slice(0, 8)
    if (!words.length) {
      return []
    }
    const matches = words.map(word => or(contains(items.title, word), contains(body, word)))
    const rank = sql<number>`(${sql.join(words.map(word => sql`CASE WHEN ${contains(items.title, word)} THEN 3 WHEN ${contains(body, word)} THEN 1 ELSE 0 END`), sql` + `)})`
    const rows = await this.db.select({ id: items.id, workspaceId: items.workspaceId, title: items.title, content: sql<string>`substring(${body}, 1, 10000)` }).from(items)
      .leftJoin(documents, eq(documents.itemId, items.id)).leftJoin(canvases, eq(canvases.itemId, items.id)).innerJoin(workspaces, eq(workspaces.id, items.workspaceId))
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id)).leftJoin(folders, eq(folders.id, items.folderId))
      .where(and(inArray(items.id, ids), itemVisibility(userId), eq(items.workspaceId, workspaceId), or(...matches))).orderBy(desc(rank), desc(items.updatedAt)).limit(5)
    return rows
  }
}
