import { MemoryResourceAccess, MemoryWorkspaces, MemoryPages, MemoryFolders, MemoryJournal, OWNER_ID, EDITOR_ID, WORKSPACE_ID } from '../support/fakes'
import { describe, expect, test } from 'bun:test'
import { WorkspaceAccessPolicy } from '../../server/features/workspaces/application/WorkspaceAccessPolicy'
import { PageService } from '../../server/features/pages/application/PageService'
import { FolderService } from '../../server/features/workspaces/application/FolderService'
import { defaultNotificationPreferences, defaultWorkspaceSettings } from '../../shared/kernel/workspaceSettings'
import { settingsInputSchema, notificationPreferencesSchema } from '../../shared/validation/workspaceSettings'
import { nextDigestAt } from '../../server/features/mail/domain/digestSchedule'
import { BunWorkspaceArchive } from '../../server/features/settings/infrastructure/BunWorkspaceArchive'
import { EmailDeliveryService } from '../../server/features/mail/application/EmailDeliveryService'
import type { EmailDelivery } from '../../server/features/mail/domain/EmailDelivery'
import type { EmailOutbox } from '../../server/features/mail/domain/EmailOutbox'

describe('workspace governance', () => {
  test('permissions restrict content creation and deletion without blocking reads or managers', async () => {
    const repo = new MemoryWorkspaces()
    const access = new WorkspaceAccessPolicy(repo)
    const journal = new MemoryJournal()
    const folders = new FolderService(new MemoryFolders(), access, journal, new MemoryResourceAccess())
    const pages = new PageService(new MemoryPages(), access, folders, journal, new MemoryResourceAccess())
    const page = await pages.create(WORKSPACE_ID, { title: 'Plan' }, EDITOR_ID)
    repo.workspace.settings.permissions.createPages = 'managers'
    repo.workspace.settings.permissions.createFolders = 'managers'
    repo.workspace.settings.permissions.deleteContent = 'managers'
    await expect(pages.create(WORKSPACE_ID, { title: 'Blocked' }, EDITOR_ID)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(folders.create(WORKSPACE_ID, 'Blocked', EDITOR_ID)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(pages.delete(page.id, EDITOR_ID)).rejects.toMatchObject({ code: 'forbidden' })
    expect((await pages.get(page.id, EDITOR_ID)).title).toBe('Plan')
    await pages.create(WORKSPACE_ID, { title: 'Manager page' }, OWNER_ID)
    expect(journal.entries.some(row => row.action === 'page.created')).toBe(true)
  })
  test('archiving blocks writes for every role while keeping content readable', async () => {
    const repo = new MemoryWorkspaces()
    const access = new WorkspaceAccessPolicy(repo)
    repo.workspace.archivedAt = new Date()
    expect((await access.requireMember(WORKSPACE_ID, EDITOR_ID)).id).toBe(WORKSPACE_ID)
    await expect(access.requireWritable(WORKSPACE_ID, OWNER_ID)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(access.requireCapability(WORKSPACE_ID, EDITOR_ID, 'createPages')).rejects.toMatchObject({ code: 'forbidden' })
  })
  test('settings reject unsupported policy values and daily delivery has an explicit Jakarta boundary', () => {
    expect(settingsInputSchema.safeParse({ ...defaultWorkspaceSettings(), trashRetentionDays: 1 }).success).toBe(false)
    expect(notificationPreferencesSchema.safeParse(defaultNotificationPreferences()).success).toBe(true)
    expect(nextDigestAt(new Date('2026-11-12T00:59:59Z')).toISOString()).toBe('2026-11-12T01:00:00.000Z')
    expect(nextDigestAt(new Date('2026-11-12T01:00:00Z')).toISOString()).toBe('2026-11-13T01:00:00.000Z')
  })
  test('exports preserve folders, include local images and reject path traversal in names', async () => {
    const filename = '019a71f3-32c1-7000-8000-000000000002.png'
    const archive = new BunWorkspaceArchive({ async write() {
      return filename
    }, async read() {
      return new Uint8Array([1, 2, 3])
    } }, '/tmp')
    const bytes = await archive.create({ name: 'Team', attachments: [filename], folders: [{ id: 'folder', name: '../../etc' }], pages: [{ id: 'page', title: '../Project', folderId: 'folder', markdown: `![Image](/images/${filename})` }] })
    const files = await new Bun.Archive(bytes).files()
    expect([...files.keys()].some(path => path.startsWith('../'))).toBe(false)
    expect(files.has(`attachments/${filename}`)).toBe(true)
    expect(await files.get('etc-folder/Project-page.md')!.text()).toContain(`../attachments/${filename}`)
    expect(files.has('workspace.json')).toBe(true)
    const restricted = await new Bun.Archive(await archive.create({ name: 'Team', attachments: [], folders: [], pages: [{ id: 'copy', title: 'Copy', folderId: null, markdown: `![Private URL](/images/${filename})` }] })).files()
    expect(restricted.has(`attachments/${filename}`)).toBe(false)
  })
  test('daily summaries bundle accessible notifications and skip revoked items before SMTP', async () => {
    const item: EmailDelivery = { id: 'first', recipient: 'member@example.invalid', recipientUserId: 'member', workspaceId: 'team', pageId: 'page', memberId: null, kind: 'mention', title: 'New mention', activity: { actorName: 'Alex', workspaceName: 'Team', body: 'Please review.' }, attempts: 1, leaseToken: 'lease' }
    const entries = [item, { ...item, id: 'second' }, { ...item, id: 'revoked' }]
    const states: string[] = []
    const outbox: EmailOutbox = { async claim() {
      return { ...item, digest: entries }
    }, async deliverable(delivery) {
      return delivery.id !== 'revoked'
    }, async complete(delivery, state) {
      states.push(`${delivery.id}:${state}`)
    }, async retry() {
      throw new Error('Unexpected retry')
    } }
    let sent = 0
    const service = new EmailDeliveryService(outbox, { async send(message) {
      sent++
      expect(message.subject).toContain('Daily summary')
      expect(message.html).toContain('2 updates in Team')
    } }, { now: () => new Date() }, 'https://notes.example.invalid')
    await service.deliverNext()
    expect(sent).toBe(1)
    expect(states).toEqual(['revoked:skipped', 'first:sent', 'second:sent'])
  })
})
