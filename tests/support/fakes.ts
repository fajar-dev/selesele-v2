import type { Account } from '../../server/domain/entities/Account'
import type { MicrosoftIdentity } from '../../server/domain/entities/MicrosoftIdentity'
import type { IdentityProvider } from '../../server/domain/ports/IdentityProvider'
import type { SessionRepository } from '../../server/domain/ports/SessionRepository'
import type { UserRepository } from '../../server/domain/ports/UserRepository'
import type { DocumentRepository } from '../../server/domain/ports/DocumentRepository'
import type { Page } from '../../server/domain/entities/Page'
import type { PageRepository } from '../../server/domain/ports/PageRepository'
import type { WorkspaceRepository } from '../../server/domain/ports/WorkspaceRepository'
import type { FolderRepository } from '../../server/domain/ports/FolderRepository'
import type { Folder } from '../../server/domain/entities/Folder'
import type { Workspace } from '../../server/domain/entities/Workspace'
import type { PageInput, PageUpdate } from '../../shared/types/page'
import type { InviteRole, WorkspaceRole } from '../../shared/types/workspace'

export const OWNER_ID = '019a71f3-32c1-7000-8000-000000000002'
export const EDITOR_ID = '019a71f3-32c1-7000-8000-000000000003'
export const WORKSPACE_ID = '019a71f3-32c1-7000-8000-000000000004'

export class MemoryWorkspaces implements WorkspaceRepository {
  readonly workspace: Workspace = { id: WORKSPACE_ID, name: 'Team', icon: '🏡', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
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

  async update(_id: string, input: { name?: string, icon?: string }) {
    Object.assign(this.workspace, input)
  }

  async delete() {
    this.workspace.deletedAt = new Date()
  }

  async members() {
    return [...this.membership].map(([userId, role]) => ({ userId, email: userId === OWNER_ID ? 'owner@example.com' : 'editor@example.com', role, name: null, avatar: null }))
  }

  async changeRole(_id: string, userId: string, role: InviteRole) {
    if (this.membership.get(userId) === 'owner' || !this.membership.has(userId)) {
      return false
    }
    this.membership.set(userId, role)
    return true
  }

  async removeMember(_id: string, userId: string) {
    return this.membership.get(userId) !== 'owner' && this.membership.delete(userId)
  }

  async invite() {}
  async invitations() {
    return []
  }

  async inbox() {
    return []
  }

  async accept() {
    return null
  }

  async decline() {}
  async cancelInvitation() {}
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
    const folder = { id: crypto.randomUUID(), workspaceId, name, createdAt: new Date(), updatedAt: new Date() }
    this.rows.set(folder.id, folder)
    return folder
  }

  async rename(id: string, _workspaceId: string, name: string) {
    this.rows.get(id)!.name = name
  }

  async delete(id: string) {
    this.rows.delete(id)
  }
}

export class MemoryPages implements PageRepository, DocumentRepository {
  readonly page: Page = { id: '019a71f3-32c1-7000-8000-000000000001', workspaceId: WORKSPACE_ID, folderId: null,
    title: 'Test', icon: null, description: null, createdBy: OWNER_ID, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }

  markdown = '# Hello\n\nA persistent document.'
  state: Uint8Array | null = null
  saves = 0
  failSave = false
  async list(workspaceId: string) {
    return this.page.workspaceId === workspaceId && !this.page.deletedAt ? [this.page] : []
  }

  async find(id: string) {
    return id === this.page.id && !this.page.deletedAt ? this.page : null
  }

  async create(inputWorkspace: string, input: PageInput, userId: string) {
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

  async updateContent(_id: string, content: string) {
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
  readonly sessions = new Map<string, { user: Account, expiresAt: Date }>()
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
