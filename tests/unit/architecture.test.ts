import { describe, expect, test } from 'bun:test'
import { AuthService } from '../../server/features/identity/application/AuthService'
import { CryptographicTokens } from '../../server/features/identity/infrastructure/CryptographicTokens'
import { SESSION_TTL_SECONDS } from '../../server/features/identity/domain/SessionPolicy'
import { WorkspaceAccessPolicy } from '../../server/features/workspaces/application/WorkspaceAccessPolicy'
import { FolderService } from '../../server/features/workspaces/application/FolderService'
import { PageService } from '../../server/features/pages/application/PageService'
import { MemoryAccounts, MemoryFolders, MemoryPages, MemoryWorkspaces, OWNER_ID, WORKSPACE_ID } from '../support/fakes'

describe('application boundaries', () => {
  test('session lifetime uses the injected clock, including the exact expiry boundary', async () => {
    const accounts = new MemoryAccounts()
    let now = new Date('2030-01-01T00:00:00Z')
    const auth = new AuthService(accounts, accounts, new CryptographicTokens(), { now: () => now })
    const session = await auth.login(await accounts.verify(), null)
    const expires = now.getTime() + SESSION_TTL_SECONDS * 1000
    expect([...accounts.sessions.values()][0]!.expiresAt.getTime()).toBe(expires)
    now = new Date(expires - 1)
    expect(await auth.authenticate(session.token)).toEqual(session.user)
    now = new Date(expires)
    await expect(auth.authenticate(session.token)).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  test('collection use cases authorize independently before accessing their repositories', async () => {
    const workspaces = new MemoryWorkspaces()
    const folders = new MemoryFolders()
    const pages = new MemoryPages()
    const access = new WorkspaceAccessPolicy(workspaces)
    const folderService = new FolderService(folders, access)
    const pageService = new PageService(pages, access, folderService)
    await expect(folderService.list(WORKSPACE_ID, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    await expect(pageService.list(WORKSPACE_ID, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    expect(await folderService.list(WORKSPACE_ID, OWNER_ID)).toEqual([])
    expect(await pageService.list(WORKSPACE_ID, OWNER_ID)).toHaveLength(1)
  })
})
