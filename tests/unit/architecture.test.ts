import { describe, expect, spyOn, test } from 'bun:test'
import { AuthService } from '../../server/features/identity/application/AuthService'
import { CryptographicTokens } from '../../server/features/identity/infrastructure/CryptographicTokens'
import { SESSION_TTL_SECONDS } from '../../server/features/identity/domain/SessionPolicy'
import { WorkspaceAccessPolicy } from '../../server/features/workspaces/application/WorkspaceAccessPolicy'
import { WorkspaceOverviewService } from '../../server/features/workspaces/application/WorkspaceOverviewService'
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

  test('workspace overview authorizes once and never reads collections for outsiders', async () => {
    const workspaces = new MemoryWorkspaces()
    const folders = new MemoryFolders()
    const pages = new MemoryPages()
    const access = new WorkspaceAccessPolicy(workspaces)
    const authorization = spyOn(access, 'requireMember')
    const folderRead = spyOn(folders, 'list')
    const pageRead = spyOn(pages, 'list')
    const memberRead = spyOn(workspaces, 'members')
    const overview = new WorkspaceOverviewService(access, folders, pages, workspaces)
    await expect(overview.get(WORKSPACE_ID, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    expect(folderRead).not.toHaveBeenCalled()
    expect(pageRead).not.toHaveBeenCalled()
    expect(memberRead).not.toHaveBeenCalled()
    authorization.mockClear()
    const result = await overview.get(WORKSPACE_ID, OWNER_ID)
    expect(authorization).toHaveBeenCalledTimes(1)
    expect(folderRead).toHaveBeenCalledWith(WORKSPACE_ID)
    expect(pageRead).toHaveBeenCalledWith(WORKSPACE_ID)
    expect(memberRead).toHaveBeenCalledWith(WORKSPACE_ID)
    expect(result.workspace.role).toBe('owner')
    expect(result.members).toHaveLength(2)
  })
})
