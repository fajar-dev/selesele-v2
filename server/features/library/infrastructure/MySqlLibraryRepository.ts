import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import { and, desc, eq, isNotNull, isNull, or, sql, inArray } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { documents, folders, pageActivity, pageLinks, pages, workspaceMembers, workspaces } from '../../../platform/database/schema'
import { pageVisibility } from '../../../platform/database/pageVisibility'
import type { LibraryRepository } from '../domain/LibraryRepository'
import type { LibraryEntry } from '../../../../shared/contracts/library'

const columns = { id: pages.id, kind: sql<'page'>`'page'`, workspaceId: pages.workspaceId, title: pages.title, icon: pages.icon, snippet: sql<string>`substring(${documents.markdown}, 1, 240)` }
const pattern = (value: string) => `%${value.replaceAll('=', '==').replaceAll('%', '=%').replaceAll('_', '=_')}%`
const contains = (column: typeof pages.title | typeof documents.markdown, value: string) => sql`${column} LIKE ${pattern(value)} ESCAPE '='`
export class MySqlLibraryRepository implements LibraryRepository {
  constructor(private readonly db: Database) {}
  private readable(userId: string) {
    return this.db.select(columns).from(pages).innerJoin(documents, eq(documents.pageId, pages.id))
      .innerJoin(workspaces, eq(workspaces.id, pages.workspaceId)).innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .leftJoin(folders, eq(folders.id, pages.folderId)).where(pageVisibility(userId)).$dynamic()
  }

  async search(userId: string, query: string, workspaceId?: string): Promise<LibraryEntry[]> {
    if (!query.trim()) {
      return []
    }
    const scope = await loadResourceScope(this.db, userId, workspaceId)
    const pageIds = scope.allowed('page')
    const folderIds = scope.allowed('folder')
    const pageRows = pageIds.length
      ? await this.readable(userId).where(and(inArray(pages.id, pageIds), pageVisibility(userId), workspaceId ? eq(pages.workspaceId, workspaceId) : undefined,
          or(contains(pages.title, query), contains(documents.markdown, query)))).orderBy(desc(pages.updatedAt)).limit(30)
      : []
    const workspaceRows = await this.db.select({ id: workspaces.id, workspaceId: workspaces.id, title: workspaces.name, icon: workspaces.icon, snippet: workspaces.description }).from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id)).where(and(eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt),
        workspaceId ? eq(workspaces.id, workspaceId) : undefined, sql`${workspaces.name} LIKE ${pattern(query)} ESCAPE '='`)).limit(10)
    const folderRows = folderIds.length
      ? await this.db.select({ id: folders.id, workspaceId: folders.workspaceId, title: folders.name, icon: folders.icon, snippet: folders.description }).from(folders)
          .innerJoin(workspaces, eq(workspaces.id, folders.workspaceId)).innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
          .where(and(inArray(folders.id, folderIds), eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt), isNull(folders.deletedAt), workspaceId ? eq(workspaces.id, workspaceId) : undefined,
            sql`${folders.name} LIKE ${pattern(query)} ESCAPE '='`)).limit(10)
      : []
    return [...pageRows, ...folderRows.map(row => ({ ...row, kind: 'folder' as const })), ...workspaceRows.map(row => ({ ...row, kind: 'workspace' as const }))]
  }

  async personal(userId: string) {
    const ids = (await loadResourceScope(this.db, userId)).allowed('page')
    if (!ids.length) {
      return { favorites: [], recent: [] }
    }
    const query = () => this.readable(userId).innerJoin(pageActivity, and(eq(pageActivity.pageId, pages.id), eq(pageActivity.userId, userId)))
    const [favorites, recent] = await Promise.all([
      query().where(and(inArray(pages.id, ids), pageVisibility(userId), isNotNull(pageActivity.favoriteAt))).orderBy(desc(pageActivity.favoriteAt)).limit(100),
      query().where(and(inArray(pages.id, ids), pageVisibility(userId), isNotNull(pageActivity.visitedAt))).orderBy(desc(pageActivity.visitedAt)).limit(20)
    ])
    return { favorites, recent }
  }

  async favorite(userId: string, pageId: string, favorite: boolean) {
    const favoriteAt = favorite ? new Date() : null
    await this.db.insert(pageActivity).values({ userId, pageId, favoriteAt }).onDuplicateKeyUpdate({ set: { favoriteAt } })
  }

  async visit(userId: string, pageId: string) {
    const visitedAt = new Date()
    await this.db.insert(pageActivity).values({ userId, pageId, visitedAt }).onDuplicateKeyUpdate({ set: { visitedAt } })
  }

  async backlinks(userId: string, pageId: string) {
    const ids = (await loadResourceScope(this.db, userId)).allowed('page')
    if (!ids.length) {
      return []
    }
    return this.readable(userId).innerJoin(pageLinks, eq(pageLinks.sourceId, pages.id))
      .where(and(inArray(pages.id, ids), pageVisibility(userId), eq(pageLinks.targetId, pageId))).orderBy(desc(pages.updatedAt)).limit(100)
  }

  async context(userId: string, question: string, workspaceId: string) {
    const ids = (await loadResourceScope(this.db, userId, workspaceId)).allowed('page')
    if (!ids.length) {
      return []
    }
    const stop = new Set('the and what where when which how does this that with from about are was for apa siapa kapan mana yang dan dari untuk dengan pada ini itu bagaimana apakah'.split(' '))
    const words = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])].filter(word => word.length > 2 && !stop.has(word)).slice(0, 8)
    if (!words.length) {
      return []
    }
    const matches = words.map(word => or(contains(pages.title, word), contains(documents.markdown, word)))
    const rank = sql<number>`(${sql.join(words.map(word => sql`CASE WHEN ${contains(pages.title, word)} THEN 3 WHEN ${contains(documents.markdown, word)} THEN 1 ELSE 0 END`), sql` + `)})`
    const rows = await this.db.select({ id: pages.id, workspaceId: pages.workspaceId, title: pages.title, content: sql<string>`substring(${documents.markdown}, 1, 10000)` }).from(pages)
      .innerJoin(documents, eq(documents.pageId, pages.id)).innerJoin(workspaces, eq(workspaces.id, pages.workspaceId))
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id)).leftJoin(folders, eq(folders.id, pages.folderId))
      .where(and(inArray(pages.id, ids), pageVisibility(userId), eq(pages.workspaceId, workspaceId), or(...matches))).orderBy(desc(rank), desc(pages.updatedAt)).limit(5)
    return rows
  }
}
