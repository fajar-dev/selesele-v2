import type { WorkspaceAuthorization } from '../domain/WorkspaceAuthorization'
import type { MembershipRepository } from '../domain/MembershipRepository'
import type { FolderRepository } from '../domain/FolderRepository'
import type { PageRepository } from '../../pages/domain/PageRepository'

/** One authorization check, then independent indexed reads for the workspace screen. */
export class WorkspaceOverviewService {
  constructor(private readonly access: WorkspaceAuthorization, private readonly folders: FolderRepository,
    private readonly pages: PageRepository, private readonly members: MembershipRepository) {}

  async get(workspaceId: string, userId: string) {
    const workspace = await this.access.requireMember(workspaceId, userId)
    const [folders, pages, members] = await Promise.all([
      this.folders.list(workspaceId), this.pages.list(workspaceId), this.members.members(workspaceId)
    ])
    return { workspace, folders, pages, members }
  }
}
