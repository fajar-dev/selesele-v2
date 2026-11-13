import type { WorkspaceJournal } from '../../settings/domain/WorkspaceJournal'
import type { WorkspaceRepository, WorkspaceDraft, WorkspaceChanges } from '../domain/WorkspaceRepository'
import type { WorkspaceAuthorization } from '../domain/WorkspaceAuthorization'

export class WorkspaceService {
  constructor(private readonly workspaces: WorkspaceRepository, private readonly access: WorkspaceAuthorization, private readonly journal: WorkspaceJournal) {}

  get(id: string, userId: string) {
    return this.access.requireMember(id, userId)
  }

  list(userId: string) {
    return this.workspaces.list(userId)
  }

  async create(input: WorkspaceDraft, userId: string) {
    const workspace = await this.workspaces.create(input, userId)
    return this.access.requireMember(workspace.id, userId)
  }

  async update(id: string, input: WorkspaceChanges, userId: string) {
    await this.access.requireManager(id, userId)
    await this.access.requireWritable(id, userId)
    await this.workspaces.update(id, input)
    await this.journal.record(id, userId, 'workspace.updated', input.name || 'Workspace details')
    return this.access.requireMember(id, userId)
  }

  async delete(id: string, userId: string) {
    await this.access.requireOwner(id, userId)
    await this.workspaces.delete(id)
    await this.journal.record(id, userId, 'workspace.deleted', 'Workspace moved to trash')
  }
}
