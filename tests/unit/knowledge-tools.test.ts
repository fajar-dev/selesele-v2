import { needsSnapshot, snapshotPolicy } from '../../server/features/recovery/domain/snapshotPolicy'
import { NotificationService } from '../../server/features/notifications/application/NotificationService'
import { describe, expect, test } from 'bun:test'
import { RecoveryService } from '../../server/features/recovery/application/RecoveryService'
import { WorkspaceQuestionService } from '../../server/features/writing/application/WorkspaceQuestionService'
import type { RecoveryRepository } from '../../server/features/recovery/domain/RecoveryRepository'
import type { TrashItem } from '../../shared/kernel/recovery'
import { documentLinks } from '../../server/features/library/domain/documentLinks'
import { pageTemplates } from '../../server/features/library/domain/templates'
import { LibraryService } from '../../server/features/library/application/LibraryService'
import { questionSchema } from '../../shared/validation/library'
import { OWNER_ID, WORKSPACE_ID, MemoryFolders, MemoryPages, MemoryWorkspaces } from '../support/fakes'
import { PageService } from '../../server/features/pages/application/PageService'
import { FolderService } from '../../server/features/workspaces/application/FolderService'
import { WorkspaceAccessPolicy } from '../../server/features/workspaces/application/WorkspaceAccessPolicy'

describe('knowledge tools and recovery boundaries', () => {
  test('only accessible trashed items can be restored, permanent deletion requires manager rights', async () => {
    const item: TrashItem = { id: 'trashed', kind: 'page', workspaceId: WORKSPACE_ID, title: 'Private', icon: null, workspaceName: 'Team', canPurge: false, deletedAt: new Date().toISOString() }
    const changed: string[] = []
    const repository: RecoveryRepository = {
      async findTrashed(userId, kind, id) {
        return userId === OWNER_ID && kind === item.kind && id === item.id ? item : null
      },
      async trash(userId) {
        return userId === OWNER_ID ? [item] : []
      },
      async restore() {
        changed.push('restore')
      }, async purge() {
        changed.push('purge')
      },
      async versions() {
        return []
      }, async version() {
        return null
      }, async checkpoint() {}
    }
    const service = new RecoveryService(repository, { async get() {
      throw new Error('Access denied')
    } }, { async replaceMarkdown() {} })
    await expect(service.restore('outsider', 'page', 'trashed')).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.purge(OWNER_ID, 'page', 'trashed')).rejects.toMatchObject({ code: 'forbidden' })
    await service.restore(OWNER_ID, 'page', 'trashed')
    expect(changed).toEqual(['restore'])
    item.canPurge = true
    await service.purge(OWNER_ID, 'page', 'trashed')
    expect(changed).toEqual(['restore', 'purge'])
    await expect(service.versions('outsider', 'private')).rejects.toThrow('Access denied')
  })
  test('question answering never calls the model without readable sources and returns source metadata without document content', async () => {
    let called = false
    let hasSources = false
    const service = new WorkspaceQuestionService({ async context() {
      return hasSources ? [{ id: 'page', workspaceId: WORKSPACE_ID, title: 'Project plan', content: 'Launch is Monday.' }] : []
    } }, {
      stream(prompt, system) {
        called = true
        expect(prompt).toContain('Launch is Monday.')
        expect(system).toContain('untrusted data')
        return new ReadableStream({ start(controller) {
          controller.enqueue('Launch is Monday [1].')
          controller.close()
        } })
      }
    })
    const empty = await service.answer(OWNER_ID, 'When is launch?', WORKSPACE_ID)
    expect(empty.sources).toEqual([])
    expect(called).toBe(false)
    hasSources = true
    const answer = await service.answer(OWNER_ID, 'When is launch?', WORKSPACE_ID)
    expect(answer.answer).toContain('[1]')
    expect(answer.sources).toEqual([{ id: 'page', workspaceId: WORKSPACE_ID, title: 'Project plan' }])
    expect(questionSchema.safeParse({ question: 'hello', workspaceId: 'invalid' }).success).toBe(false)
  })
  test('knowledge retrieval rejects a non-member before querying content', async () => {
    const access = new WorkspaceAccessPolicy(new MemoryWorkspaces())
    const pageAccess = new PageService(new MemoryPages(), access, new FolderService(new MemoryFolders(), access))
    const repository = { async search() {
      throw new Error('Repository must not be called')
    }, async context() {
      throw new Error('Repository must not be called')
    }, async personal() {
      return { favorites: [], recent: [] }
    }, async favorite() {}, async visit() {}, async backlinks() {
      return []
    } }
    const service = new LibraryService(repository, pageAccess, access)
    await expect(service.context('outsider', 'Project plan', WORKSPACE_ID)).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.search('outsider', 'Project plan', WORKSPACE_ID)).rejects.toMatchObject({ code: 'not_found' })
  })
  test('backlink extraction ignores code and external links, and templates contain real multiline Markdown', () => {
    const target = '019a71f3-32c1-7000-8000-000000000005'
    const path = `/workspaces/${WORKSPACE_ID}/pages/${target}`
    expect(documentLinks(`[Link](${path}) [Again](${path})`)).toEqual([target])
    expect(documentLinks(`\`[Example](${path})\` [External](https://example.com${path})`)).toEqual([])
    expect(pageTemplates).toHaveLength(4)
    for (const template of pageTemplates) {
      expect(template.content).toContain('\n\n## ')
    }
  })
})

describe('snapshot policy and notification failure isolation', () => {
  test('unchanged content never checkpoints and automatic snapshots respect the interval', () => {
    const previous = new Date('2026-01-01T00:00:00Z')
    const before = new Date(previous.getTime() + snapshotPolicy.intervalMs - 1)
    const boundary = new Date(previous.getTime() + snapshotPolicy.intervalMs)
    expect(needsSnapshot('same', 'same', null, boundary, true)).toBe(false)
    expect(needsSnapshot(null, 'first', null, boundary, true)).toBe(false)
    expect(needsSnapshot('old', 'new', previous, before, false)).toBe(false)
    expect(needsSnapshot('old', 'new', previous, boundary, false)).toBe(true)
    expect(needsSnapshot('old', 'new', previous, before, true)).toBe(true)
  })

  test('notification delivery failures are reported without rejecting the completed business action', async () => {
    const errors: unknown[] = []
    const failure = new Error('Delivery unavailable')
    const service = new NotificationService({
      async list() {
        return []
      },
      async read() {},
      async invitation() {
        throw failure
      },
      async comment() {
        return []
      },
      async mentions() {
        return []
      }
    }, () => {
      throw new Error('No change should be published')
    }, { report(_message, cause) {
      errors.push(cause)
    } })
    await service.invitation(WORKSPACE_ID, 'member@example.invalid', OWNER_ID)
    expect(errors).toEqual([failure])
  })
})
