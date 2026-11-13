import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { folders, items, workspaces } from '../../../platform/database/schema'
import type { RecoveryRepository } from '../../recovery/domain/RecoveryRepository'
import type { WorkspaceJournal } from '../domain/WorkspaceJournal'
import type { ErrorReporter } from '../../../core/ports/ErrorReporter'
/** Retention is opt-in; every purge rechecks the deletion timestamp under a row lock. */
export class WorkspaceMaintenance {
  private timer?: ReturnType<typeof setInterval>
  private active?: Promise<void>
  constructor(private readonly db: Database, private readonly recovery: RecoveryRepository, private readonly journal: WorkspaceJournal, private readonly errors: ErrorReporter) {
  }

  start() {
    if (this.timer) {
      return
    }
    this.timer = setInterval(() => {
      if (!this.active) {
        this.active = this.run().catch(cause => this.errors.report('Workspace retention failed', cause)).finally(() => {
          this.active = undefined
        })
      }
    }, 60000)
    this.timer.unref()
  }

  async run(now = new Date()) {
    const spaces = await this.db.select({ id: workspaces.id, settings: workspaces.settings }).from(workspaces).where(and(isNull(workspaces.deletedAt), isNull(workspaces.archivedAt), isNotNull(workspaces.settings)))
    for (const workspace of spaces) {
      const days = workspace.settings?.trashRetentionDays
      if (!days) {
        continue
      }
      const before = new Date(now.getTime() - days * 86400000)
      const directories = await this.db.select({ id: folders.id, name: folders.name }).from(folders).where(and(eq(folders.workspaceId, workspace.id), lte(folders.deletedAt, before))).limit(100)
      const notes = await this.db.select({ id: items.id, name: items.title }).from(items).where(and(eq(items.workspaceId, workspace.id), lte(items.deletedAt, before))).limit(100)
      for (const [kind, rows] of [['folder', directories], ['item', notes]] as const) {
        for (const row of rows) {
          if (!await this.recovery.purge(kind, row.id, before)) {
            continue
          }
          await this.journal.record(workspace.id, 'system', 'content.purged', `Retention policy: ${row.name}`, { itemId: kind === 'item' ? row.id : undefined, folderId: kind === 'folder' ? row.id : undefined })
        }
      }
    }
  }

  async close() {
    clearInterval(this.timer)
    this.timer = undefined
    await this.active
  }
}
