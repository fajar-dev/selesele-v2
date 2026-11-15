import { and, asc, eq, gt, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { realtimeClock, realtimeEvents, workspaceMembers, workspaces, canvasPresence, documentPresence } from '../../../platform/database/schema'
import type { RealtimeRepository } from '../domain/RealtimeRepository'

export class MySqlRealtimeRepository implements RealtimeRepository {
  constructor(private readonly db: Database) {}
  async publish() {
    await this.db.transaction(async (tx) => {
      const [clock] = await tx.select().from(realtimeClock).where(eq(realtimeClock.id, 'global')).for('update')
      if (!clock) {
        throw new Error('Realtime schema is not initialized')
      }
      const events = await tx.select({ id: realtimeEvents.id }).from(realtimeEvents).where(isNull(realtimeEvents.sequence)).limit(500).for('update', { skipLocked: true })
      if (!events.length) {
        return
      }
      let sequence = clock.sequence
      const cases = events.map(event => sql`when ${event.id} then ${++sequence}`)
      await tx.update(realtimeEvents).set({ sequence: sql`case ${realtimeEvents.id} ${sql.join(cases, sql` `)} end` }).where(inArray(realtimeEvents.id, events.map(event => event.id)))
      await tx.update(realtimeClock).set({ sequence }).where(eq(realtimeClock.id, 'global'))
    }, { isolationLevel: 'read committed' })
  }

  async latestSequence() {
    const [row] = await this.db.select().from(realtimeClock).where(eq(realtimeClock.id, 'global'))
    return row?.sequence || 0
  }

  async changes(after: number) {
    return await this.db.select({ sequence: realtimeEvents.sequence, workspaceId: realtimeEvents.workspaceId, userId: realtimeEvents.userId, topic: realtimeEvents.topic }).from(realtimeEvents).where(gt(realtimeEvents.sequence, after)).orderBy(asc(realtimeEvents.sequence)).limit(1000) as { sequence: number, workspaceId: string | null, userId: string | null, topic: typeof realtimeEvents.$inferSelect.topic }[]
  }

  async memberships(userIds: string[]) {
    if (!userIds.length) {
      return []
    }
    return await this.db.select({ userId: workspaceMembers.userId, workspaceId: workspaceMembers.workspaceId }).from(workspaceMembers).innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId)).where(and(inArray(workspaceMembers.userId, userIds), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt))) as { userId: string, workspaceId: string }[]
  }

  async prune() {
    await this.db.delete(realtimeEvents).where(and(isNotNull(realtimeEvents.sequence), sql`${realtimeEvents.createdAt} < date_sub(utc_timestamp(), interval 1 day)`)).limit(2000)
    await this.db.delete(documentPresence).where(sql`${documentPresence.updatedAt} < date_sub(utc_timestamp(), interval 25 second)`)
    await this.db.delete(canvasPresence).where(sql`${canvasPresence.updatedAt} < date_sub(utc_timestamp(), interval 25 second)`)
  }
}
