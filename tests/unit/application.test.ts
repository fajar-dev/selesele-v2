import { MemoryResourceAccess, MemoryJournal, MemoryAccounts, MemoryPages, MemoryWorkspaces, MemoryFolders, OWNER_ID, EDITOR_ID, WORKSPACE_ID } from '../support/fakes'
import { PageDocumentService } from '../../server/features/pages/application/PageDocumentService'
import { CryptographicTokens } from '../../server/features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../../server/platform/runtime/SystemClock'
import { WorkspaceAccessPolicy } from '../../server/features/workspaces/application/WorkspaceAccessPolicy'
import { describe, expect, test } from 'bun:test'
import { PageService } from '../../server/features/pages/application/PageService'
import { WorkspaceService } from '../../server/features/workspaces/application/WorkspaceService'
import { FolderService } from '../../server/features/workspaces/application/FolderService'
import { AuthService } from '../../server/features/identity/application/AuthService'

function fixture() {
  const repository = new MemoryPages()
  const memberships = new MemoryWorkspaces()
  const folderRows = new MemoryFolders()
  const access = new WorkspaceAccessPolicy(memberships)
  const workspaces = new WorkspaceService(memberships, access, new MemoryJournal())
  const folders = new FolderService(folderRows, access, new MemoryJournal(), new MemoryResourceAccess(repository, folderRows))
  const service = new PageService(repository, access, folders, new MemoryJournal(), new MemoryResourceAccess(repository, folderRows))
  const documents = new PageDocumentService(service, repository, repository)
  return { repository, memberships, folderRows, workspaces, access, folders, service, documents, id: repository.page.id }
}

describe('workspace authorization', () => {
  test('workspace members can create, edit and move pages with inherited access', async () => {
    const { service, documents, repository, folders, id } = fixture()
    await service.update(id, { title: 'Shared page' }, EDITOR_ID)
    await documents.replace(id, '# Shared edit', EDITOR_ID)
    const folder = await folders.create(WORKSPACE_ID, 'Projects', EDITOR_ID)
    await service.move(id, folder.id, EDITOR_ID)
    expect(repository.page.folderId).toBe(folder.id)
    expect(repository.markdown).toBe('# Shared edit')
    await service.move(id, null, EDITOR_ID)
    expect(repository.page.folderId).toBeNull()
  })

  test('outsiders cannot enumerate or mutate workspace resources', async () => {
    const { service, documents, access, folders, id } = fixture()
    await expect(access.requireMember(WORKSPACE_ID, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.get(id, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    await expect(documents.content(id, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    await expect(documents.replace(id, 'Injected content', 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.list(WORKSPACE_ID, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.create(WORKSPACE_ID, { title: 'Injected' }, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    await expect(folders.create(WORKSPACE_ID, 'Injected', 'outsider')).rejects.toMatchObject({ code: 'not_found' })
  })

  test('rejects folders from another workspace when creating or moving pages', async () => {
    const { service, folderRows, repository, id } = fixture()
    const foreign = await folderRows.create('other-workspace', 'Private')
    await expect(service.move(id, foreign.id, OWNER_ID)).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.create(WORKSPACE_ID, { title: 'Injected', folderId: foreign.id }, OWNER_ID)).rejects.toMatchObject({ code: 'not_found' })
    expect(repository.page.folderId).toBeNull()
  })

  test('only managers can change workspace configuration', async () => {
    const { workspaces, access } = fixture()
    await expect(workspaces.delete(WORKSPACE_ID, EDITOR_ID)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(access.requireManager(WORKSPACE_ID, EDITOR_ID)).rejects.toMatchObject({ code: 'forbidden' })
  })

  test('revocation and workspace deletion remove access to all page content', async () => {
    const { workspaces, memberships, documents, id } = fixture()
    memberships.membership.delete(EDITOR_ID)
    await expect(documents.content(id, EDITOR_ID)).rejects.toMatchObject({ code: 'not_found' })
    await workspaces.delete(WORKSPACE_ID, OWNER_ID)
    await expect(documents.content(id, OWNER_ID)).rejects.toMatchObject({ code: 'not_found' })
  })
})

describe('server sessions', () => {
  test('stores a digest, returns a public profile, and revokes sessions on logout', async () => {
    const repository = new MemoryAccounts()
    const auth = new AuthService(repository, repository, new CryptographicTokens(), new SystemClock())
    const session = await auth.login(await repository.verify(), null)
    expect(session.token).toHaveLength(43)
    expect(repository.sessions.has(session.token)).toBe(false)
    expect(Object.keys(session.user).sort()).toEqual(['avatar', 'email', 'id', 'name'])
    expect(await auth.authenticate(session.token)).toEqual(session.user)
    await auth.logout(session.token)
    await expect(auth.authenticate(session.token)).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  test('rotation invalidates the old session, including replay attempts', async () => {
    const repository = new MemoryAccounts()
    const auth = new AuthService(repository, repository, new CryptographicTokens(), new SystemClock())
    const first = await auth.login(await repository.verify(), null)
    const second = await auth.refresh(first.token)
    expect(second.token).not.toBe(first.token)
    await expect(auth.authenticate(first.token)).rejects.toMatchObject({ code: 'unauthenticated' })
    await expect(auth.refresh(first.token)).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(await auth.authenticate(second.token)).toEqual(first.user)
  })

  test('expired and disabled accounts are rejected', async () => {
    const repository = new MemoryAccounts()
    const auth = new AuthService(repository, repository, new CryptographicTokens(), new SystemClock())
    const session = await auth.login(await repository.verify(), null)
    for (const stored of repository.sessions.values()) {
      stored.expiresAt = new Date(0)
    }
    await expect(auth.authenticate(session.token)).rejects.toMatchObject({ code: 'unauthenticated' })
    repository.account.isActive = false
    await expect(auth.login(await repository.verify(), null)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(auth.authenticate()).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})
