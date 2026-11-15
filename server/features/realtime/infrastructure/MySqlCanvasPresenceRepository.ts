import { and, eq, gt, count } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { canvasPresence, users } from '../../../platform/database/schema'
import type { CanvasPresence } from '../../../../shared/model/presence'

export class MySqlCanvasPresenceRepository {
  constructor(private readonly db: Database) {}
  async list(itemId: string): Promise<CanvasPresence[]> {
    const rows = await this.db.select({ session: canvasPresence, name: users.name }).from(canvasPresence).innerJoin(users, eq(users.id, canvasPresence.userId)).where(and(eq(canvasPresence.itemId, itemId), gt(canvasPresence.updatedAt, new Date(Date.now() - 25000))))
    const palette = ['#2563eb', '#9333ea', '#16a34a', '#dc2626', '#d97706']
    return rows.map(({ session, name }) => ({ sessionId: session.sessionId, userId: session.userId, name: name || 'Workspace member', color: palette[[...session.userId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % palette.length]!, cursor: session.cursor, selected: session.selected, updatedAt: session.updatedAt.getTime() }))
  }

  async update(itemId: string, value: CanvasPresence) {
    await this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(canvasPresence).where(eq(canvasPresence.sessionId, value.sessionId)).for('update')
      if (existing && (existing.userId !== value.userId || existing.itemId !== itemId)) {
        return
      }
      const [total] = await tx.select({ value: count() }).from(canvasPresence).where(and(eq(canvasPresence.itemId, itemId), gt(canvasPresence.updatedAt, new Date(Date.now() - 25000))))
      if (!existing && Number(total?.value || 0) >= 100) {
        return
      }
      const record = { sessionId: value.sessionId, itemId, userId: value.userId, cursor: value.cursor, selected: value.selected, updatedAt: new Date() }
      if (existing) {
        await tx.update(canvasPresence).set({ cursor: record.cursor, selected: record.selected, updatedAt: record.updatedAt }).where(and(eq(canvasPresence.sessionId, value.sessionId), eq(canvasPresence.userId, value.userId)))
      } else {
        try {
          await tx.insert(canvasPresence).values(record)
        } catch (cause) {
          const code = (cause as { cause?: { code?: string } }).cause?.code
          if (code !== 'ER_DUP_ENTRY') {
            throw cause
          }
        }
      }
    }, { isolationLevel: 'read committed' })
  }

  async remove(itemId: string, userId: string, sessionId: string) {
    await this.db.delete(canvasPresence).where(and(eq(canvasPresence.itemId, itemId), eq(canvasPresence.userId, userId), eq(canvasPresence.sessionId, sessionId)))
  }
}
