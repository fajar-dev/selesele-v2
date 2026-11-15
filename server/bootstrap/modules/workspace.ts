import { MySqlResourceAccess } from '../../features/access/infrastructure/MySqlResourceAccess'
import { MemberService } from '../../features/members/application/MemberService'
import { MySqlMemberRepository } from '../../features/members/infrastructure/MySqlMemberRepository'
import { MySqlWorkspaceJournal } from '../../features/settings/infrastructure/MySqlWorkspaceJournal'
import { WorkspaceAccessPolicy } from '../../features/workspaces/application/WorkspaceAccessPolicy'
import { WorkspaceService } from '../../features/workspaces/application/WorkspaceService'
import { FolderService } from '../../features/workspaces/application/FolderService'
import { MySqlWorkspaceRepository } from '../../features/workspaces/infrastructure/MySqlWorkspaceRepository'
import { MySqlFolderRepository } from '../../features/workspaces/infrastructure/MySqlFolderRepository'
import { ItemService } from '../../features/items/application/ItemService'
import { MySqlItemRepository } from '../../features/items/infrastructure/MySqlItemRepository'
import type { RuntimeModule } from './runtime'

export function createWorkspaceModule(runtime: RuntimeModule) {
  const { database, emailConfig } = runtime
  const journal = new MySqlWorkspaceJournal(database.db)
  const workspaceRepository = new MySqlWorkspaceRepository(database.db)
  const resources = new MySqlResourceAccess(database.db)
  const folderRepository = new MySqlFolderRepository(database.db)
  const workspaceAccess = new WorkspaceAccessPolicy(workspaceRepository)
  const workspaces = new WorkspaceService(workspaceRepository, workspaceAccess, journal)
  const folders = new FolderService(folderRepository, workspaceAccess, journal, resources)
  const itemRepository = new MySqlItemRepository(database.db)
  const items = new ItemService(itemRepository, workspaceAccess, folders, journal, resources)
  const members = new MemberService(new MySqlMemberRepository(database.db, !!emailConfig), workspaceAccess, resources)
  return { journal, resources, workspaceAccess, workspaces, folders, items, members }
}
export type WorkspaceModule = ReturnType<typeof createWorkspaceModule>
