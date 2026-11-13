import { and, desc, eq, notInArray } from 'drizzle-orm'
import type { DatabaseTransaction } from './client'
import { itemVersions } from './schema'
import { snapshotPolicy } from '../../features/recovery/domain/snapshotPolicy'
/** Call within the transaction holding the item row lock. */
export async function saveItemSnapshot(transaction: DatabaseTransaction, itemId: string, content: string, authorId: string | null) {
  await transaction.insert(itemVersions).values({ itemId, content, authorId })
  const retained = await transaction.select({ id: itemVersions.id }).from(itemVersions)
    .where(eq(itemVersions.itemId, itemId)).orderBy(desc(itemVersions.createdAt), desc(itemVersions.id)).limit(snapshotPolicy.limit)
  await transaction.delete(itemVersions).where(and(eq(itemVersions.itemId, itemId), notInArray(itemVersions.id, retained.map(row => row.id))))
}
