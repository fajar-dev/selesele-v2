import { and, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { Database } from '../../../platform/database/client'
import { canvases, items, notifications, workspaces, workspaceMembers } from '../../../platform/database/schema'
import { loadResourceScope } from '../../access/infrastructure/resourceScope'
import type { ErrorReporter } from '../../../core/ports/ErrorReporter'

export class TaskReminderWorker {
  private timer?: ReturnType<typeof setInterval>
  private active?: Promise<void>
  constructor(private readonly db: Database, private readonly errors: ErrorReporter) { }
  start() {
    if (this.timer) {
      return
    }
    const tick = () => {
      if (!this.active) {
        this.active = this.run().catch(cause => this.errors.report('Task reminders failed', cause)).finally(() => {
          this.active = undefined
        })
      }
    }
    tick()
    this.timer = setInterval(tick, 60000)
    this.timer.unref()
  }

  async run(now = new Date()) {
    const boards = await this.db.select({ content: canvases.content, itemId: items.id, workspaceId: items.workspaceId, owner: items.createdBy }).from(canvases).innerJoin(items, eq(items.id, canvases.itemId)).innerJoin(workspaces, eq(workspaces.id, items.workspaceId)).where(and(eq(items.kind, 'kanban'), isNull(items.deletedAt), isNull(items.archivedAt), isNull(workspaces.deletedAt), isNull(workspaces.archivedAt)))
    for (const board of boards) {
      if (board.content.kind !== 'kanban') {
        continue
      }
      const members = await this.db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, board.workspaceId), isNull(workspaceMembers.suspendedAt)))
      for (const task of board.content.tasks) {
        if (!task.reminderAt || task.completedAt || Date.parse(task.reminderAt) > now.getTime()) {
          continue
        }
        const recipient = task.assigneeId ? members.find(member => member.id === task.assigneeId)?.userId : board.owner
        if (!recipient || !(await loadResourceScope(this.db, recipient, board.workspaceId)).allowed('item').includes(board.itemId)) {
          continue
        }
        const deduplicationKey = `task:${task.id}:${task.reminderAt}`
        const [existing] = await this.db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, recipient), eq(notifications.deduplicationKey, deduplicationKey))).limit(1)
        if (existing) {
          continue
        }
        await this.db.insert(notifications).values({ id: uuidv7(), userId: recipient, workspaceId: board.workspaceId, itemId: board.itemId, threadId: task.id, kind: 'task', title: `Task reminder: ${task.title}`.slice(0, 320), deduplicationKey }).onDuplicateKeyUpdate({ set: { userId: recipient } })
      }
    }
  }

  async close() {
    clearInterval(this.timer)
    await this.active
  }
}
