import { and, desc, eq, notInArray } from 'drizzle-orm'
import type { DatabaseTransaction } from './client'
import { pageVersions } from './schema'
import { snapshotPolicy } from '../../features/recovery/domain/snapshotPolicy'

/** Call within the transaction holding the page row lock. */
export async function savePageSnapshot(transaction: DatabaseTransaction, pageId: string, markdown: string, authorId: string | null) {
  await transaction.insert(pageVersions).values({ pageId, markdown, authorId })
  const retained = await transaction.select({ id: pageVersions.id }).from(pageVersions)
    .where(eq(pageVersions.pageId, pageId)).orderBy(desc(pageVersions.createdAt), desc(pageVersions.id)).limit(snapshotPolicy.limit)
  await transaction.delete(pageVersions).where(and(eq(pageVersions.pageId, pageId), notInArray(pageVersions.id, retained.map(row => row.id))))
}
