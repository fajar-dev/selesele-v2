import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { ItemAccess } from '../../items/domain/ItemAccess'
import type { SettingsRepository } from '../domain/SettingsRepository'
import type { WorkspaceArchive } from '../domain/WorkspaceArchive'
import type { WorkspaceSettingsChanges, WorkspaceNotificationPreferences } from '../../../../shared/kernel/workspaceSettings'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class WorkspaceSettingsService {
  constructor(private readonly repository: SettingsRepository, private readonly access: WorkspaceAuthorization, private readonly items: ItemAccess, private readonly archiveWriter: WorkspaceArchive) {
  }

  async get(id: string, userId: string) {
    const workspace = await this.access.requireMember(id, userId)
    return { settings: workspace.settings, archivedAt: workspace.archivedAt?.toISOString() ?? null, notifications: await this.repository.notifications(id, userId) }
  }

  async save(id: string, userId: string, settings: WorkspaceSettingsChanges) {
    await this.access.requireManager(id, userId)
    if (settings.homeItemId) {
      const item = await this.items.get(settings.homeItemId, userId)
      if (item.workspaceId !== id) {
        throw new ApplicationError('invalid_input', 'Home item must belong to this workspace')
      }
    }
    await this.repository.save(id, userId, settings)
    return this.get(id, userId)
  }

  async notifications(id: string, userId: string, preferences: WorkspaceNotificationPreferences) {
    await this.access.requireMember(id, userId)
    await this.repository.saveNotifications(id, userId, preferences)
    return preferences
  }

  async activity(id: string, userId: string, cursor?: string, memberId?: string) {
    await this.access.requireManager(id, userId)
    const rows = await this.repository.activity(id, userId, cursor, memberId)
    const items = rows.slice(0, 50)
    return { items, nextCursor: rows.length > 50 ? items.at(-1)!.id : null }
  }

  async usage(id: string, userId: string) {
    await this.access.requireManager(id, userId)
    const [usage, data] = await Promise.all([this.repository.usage(id, userId), this.repository.exportData(id, userId)])
    return { ...usage, attachmentBytes: await this.archiveWriter.attachmentBytes(data) }
  }

  async export(id: string, userId: string) {
    await this.access.requireManager(id, userId)
    return this.archiveWriter.create(await this.repository.exportData(id, userId))
  }

  async archive(id: string, userId: string, archived: boolean) {
    await this.access.requireOwner(id, userId)
    await this.repository.archive(id, userId, archived)
  }

  async transfer(id: string, userId: string, targetId: string) {
    await this.access.requireOwner(id, userId)
    if (targetId === userId || !await this.repository.transfer(id, userId, targetId)) {
      throw new ApplicationError('conflict', 'Choose another current workspace member')
    }
  }

  async leave(id: string, userId: string) {
    const workspace = await this.access.requireMember(id, userId)
    if (workspace.role === 'owner' || !await this.repository.leave(id, userId)) {
      throw new ApplicationError('conflict', 'Transfer ownership before leaving this workspace')
    }
  }
}
