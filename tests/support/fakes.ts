import type { ResourceAccess } from '../../server/features/access/domain/ResourceAccess'
import type { ResourceKind, AccessLevel, MemberResourceAccess, ResourcePolicy } from '../../shared/kernel/access'
import { defaultWorkspaceSettings } from '../../shared/kernel/workspaceSettings'
import { DEFAULT_FOLDER_ICON } from '../../shared/kernel/icons'
import type { Account } from '../../server/features/identity/domain/Account'
import type { MicrosoftIdentity } from '../../server/features/identity/domain/MicrosoftIdentity'
import type { IdentityProvider } from '../../server/features/identity/domain/IdentityProvider'
import type { SessionRepository } from '../../server/features/identity/domain/SessionRepository'
import type { UserRepository } from '../../server/features/identity/domain/UserRepository'
import type { DocumentRepository } from '../../server/features/pages/domain/DocumentRepository'
import type { Page } from '../../server/features/pages/domain/Page'
import type { PageRepository } from '../../server/features/pages/domain/PageRepository'
import type { WorkspaceRepository } from '../../server/features/workspaces/domain/WorkspaceRepository'
import type { FolderRepository } from '../../server/features/workspaces/domain/FolderRepository'
import type { Folder } from '../../server/features/workspaces/domain/Folder'
import type { Workspace } from '../../server/features/workspaces/domain/Workspace'
import type { PageInput, PageUpdate } from '../../shared/contracts/page'
import type { WorkspaceRole } from '../../shared/contracts/workspace'

export const OWNER_ID = '019a71f3-32c1-7000-8000-000000000002'
export const EDITOR_ID = '019a71f3-32c1-7000-8000-000000000003'
export const WORKSPACE_ID = '019a71f3-32c1-7000-8000-000000000004'
export class MemoryWorkspaces implements WorkspaceRepository {
  readonly workspace: Workspace = { id: WORKSPACE_ID, name: 'Team', description: '', icon: '🏡', createdAt: new Date(), updatedAt: new Date(), deletedAt: null, archivedAt: null, settings: defaultWorkspaceSettings() }
  readonly membership = new Map<string, WorkspaceRole>([[OWNER_ID, 'owner'], [EDITOR_ID, 'member']])
  async list(userId: string) {
    const access = await this.access(this.workspace.id, userId)
    return access ? [access] : []
  }

  async access(id: string, userId: string) {
    const role = this.membership.get(userId)
    return id === this.workspace.id && role && !this.workspace.deletedAt ? { ...this.workspace, role } : null
  }

  async create() {
    return this.workspace
  }

  async update(_id: string, input: {
    name?: string
    icon?: string
    description?: string
  }) {
    Object.assign(this.workspace, input)
  }

  async delete() {
    this.workspace.deletedAt = new Date()
  }
}
export class MemoryFolders implements FolderRepository {
  readonly rows = new Map<string, Folder>()
  async list(workspaceId: string) {
    return [...this.rows.values()].filter(folder => folder.workspaceId === workspaceId)
  }

  async find(id: string, workspaceId: string) {
    const folder = this.rows.get(id)
    return folder?.workspaceId === workspaceId ? folder : null
  }

  async create(workspaceId: string, name: string) {
    const folder = { id: crypto.randomUUID(), workspaceId, name, icon: DEFAULT_FOLDER_ICON, description: '', createdAt: new Date(), updatedAt: new Date() }
    this.rows.set(folder.id, folder)
    return folder
  }

  async update(id: string, _workspaceId: string, input: {
    name?: string
    description?: string
    icon?: string | null
  }) {
    Object.assign(this.rows.get(id)!, input)
  }

  async delete(id: string) {
    this.rows.delete(id)
  }
}
export class MemoryPages implements PageRepository, DocumentRepository {
  readonly page: Page = { id: '019a71f3-32c1-7000-8000-000000000001', workspaceId: WORKSPACE_ID, folderId: null,
    title: 'Test', description: '', icon: null, createdBy: OWNER_ID, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }

  markdown = '# Hello\n\nA persistent document.'
  state: Uint8Array | null = null
  saves = 0
  failSave = false
  async archive(_id: string, archived: boolean) {
    this.page.archivedAt = archived ? new Date() : null
  }

  async list(workspaceId: string) {
    return this.page.workspaceId === workspaceId && !this.page.deletedAt ? [this.page] : []
  }

  async find(id: string) {
    return id === this.page.id && !this.page.deletedAt ? this.page : null
  }

  async create(inputWorkspace: string, input: PageInput, userId: string, content = '') {
    this.markdown = content
    Object.assign(this.page, input, { workspaceId: inputWorkspace, createdBy: userId })
    return this.page
  }

  async update(_id: string, input: PageUpdate) {
    Object.assign(this.page, input)
  }

  async move(_id: string, folderId: string | null) {
    this.page.folderId = folderId
  }

  async delete() {
    this.page.deletedAt = new Date()
  }

  async readContent() {
    return this.markdown
  }

  async replaceMarkdown(_id: string, content: string) {
    this.markdown = content
    this.state = null
  }

  async readState() {
    return this.state
  }

  async saveState(_id: string, state: Uint8Array, markdown: string) {
    if (this.failSave) {
      throw new Error('Disk unavailable')
    }
    this.state = state.slice()
    this.markdown = markdown
    this.saves++
  }
}
export class MemoryAccounts implements UserRepository, SessionRepository, IdentityProvider {
  readonly account: Account = { id: '019a71f3-32c1-7000-8000-000000000002', email: 'owner@example.com', name: 'Owner', avatar: null, isActive: true }
  readonly sessions = new Map<string, {
    user: Account
    expiresAt: Date
  }>()

  async authorizationUrl() {
    return 'https://login.microsoftonline.com/authorize'
  }

  async verify(): Promise<MicrosoftIdentity> {
    return { subject: 'tenant-id:object-id', email: this.account.email }
  }

  async upsert() {
    return this.account
  }

  async create(hash: string, _id: string, expiresAt: Date) {
    this.sessions.set(hash, { user: this.account, expiresAt })
  }

  async find(hash: string) {
    return this.sessions.get(hash) || null
  }

  async delete(hash: string) {
    this.sessions.delete(hash)
  }

  async rotate(oldHash: string, newHash: string, expiresAt: Date) {
    const old = this.sessions.get(oldHash)
    if (!old) {
      return false
    }
    this.sessions.delete(oldHash)
    this.sessions.set(newHash, { user: old.user, expiresAt })
    return true
  }
}
export const silentActivity = {
  async comment() { },
  async mentions() { }
}
export class MemoryJournal {
  readonly entries: {
    workspaceId: string
    actorId: string
    action: string
    target: string
  }[] = []

  async record(workspaceId: string, actorId: string, action: string, target: string) {
    this.entries.push({ workspaceId, actorId, action, target })
  }
}
export class MemoryResourceAccess implements ResourceAccess {
  constructor(private readonly pages = new MemoryPages(), private readonly folders = new MemoryFolders()) { }
  async previewMove() {
    return { token: '', changes: [], canPreviewNames: true }
  }

  async movePage(pageId: string, folderId: string | null) {
    await this.pages.move(pageId, folderId)
  }

  async require(_kind: ResourceKind, _id: string, _userId: string, _level: AccessLevel) {
    return 'edit' as const
  }

  async visible(kind: ResourceKind, workspaceId: string): Promise<MemberResourceAccess[]> {
    const rows = kind === 'page' ? await this.pages.list(workspaceId) : await this.folders.list(workspaceId)
    return rows.map(item => ({ kind, id: item.id, title: 'name' in item ? item.name : item.title, folderId: null, mode: 'inherit', level: 'edit', source: 'owner', direct: null, parentLevel: 'edit', canManage: true }))
  }

  async policy(): Promise<ResourcePolicy> {
    throw new Error('Not used')
  }

  async save() { }
  async memberResources() {
    return []
  }

  async grant() { }
}
