import { MemoryResourceAccess, MemoryJournal, MemoryAccounts, MemoryItems, MemoryWorkspaces, MemoryFolders, WORKSPACE_ID } from '../support/fakes'
import { CryptographicTokens } from '../../server/features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../../server/platform/runtime/SystemClock'
import { WorkspaceAccessPolicy } from '../../server/features/workspaces/application/WorkspaceAccessPolicy'
import { COMMENTS_CHANGED } from '../../shared/collaboration/protocol'
import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'
import * as sync from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { AuthService } from '../../server/features/identity/application/AuthService'
import { FolderService } from '../../server/features/workspaces/application/FolderService'
import { ItemService } from '../../server/features/items/application/ItemService'
import { CollaborationHub } from '../../server/platform/collaboration/CollaborationHub'
import { createDocument, documentMarkdown } from '../../server/platform/collaboration/document'

class TestPeer {
  messages: Uint8Array[] = []
  closed: number | undefined
  constructor(readonly id: string) {
  }

  send(data: Uint8Array) {
    this.messages.push(data.slice())
  }

  close(code: number) {
    this.closed = code
  }

  asPeer() {
    return this
  }
}
function syncRequest(document: Y.Doc) {
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, 0)
  sync.writeSyncStep1(encoder, document)
  return encoding.toUint8Array(encoder)
}
function applyMessages(peer: TestPeer, document: Y.Doc) {
  for (const data of peer.messages.splice(0)) {
    const decoder = decoding.createDecoder(data)
    if (decoding.readVarUint(decoder) !== 0) {
      continue
    }
    const encoder = encoding.createEncoder()
    sync.readSyncMessage(decoder, encoder, document, 'server')
  }
}
async function fixture() {
  const accounts = new MemoryAccounts()
  const auth = new AuthService(accounts, accounts, new CryptographicTokens(), new SystemClock())
  const { token } = await auth.login(await accounts.verify(), null)
  const items = new MemoryItems()
  const memberships = new MemoryWorkspaces()
  const access = new WorkspaceAccessPolicy(memberships)
  const folders = new FolderService(new MemoryFolders(), access, new MemoryJournal(), new MemoryResourceAccess())
  const hub = new CollaborationHub(new ItemService(items, access, folders, new MemoryJournal(), new MemoryResourceAccess(items)), auth, items)
  return { accounts, auth, token, items, hub, memberships, id: items.item.id }
}
describe('persistent collaboration', () => {
  test('Markdown round-trips through a Yjs document including tables and lists', () => {
    const content = '# Heading\n\n**Bold** and _italic_.\n\n- One\n- Two\n\n| A | B |\n| --- | --- |\n| 1 | 2 |'
    const document = createDocument(content, null)
    const restored = createDocument('', Y.encodeStateAsUpdate(document))
    expect(documentMarkdown(restored)).toContain('# Heading')
    expect(documentMarkdown(restored)).toContain('**Bold**')
    expect(documentMarkdown(restored)).toContain('One')
    expect(documentMarkdown(restored)).toMatch(/\| A\s+\| B\s+\|/)
    document.destroy()
    restored.destroy()
  })
  test('seeds once, synchronizes two clients, and persists updates across reconnects', async () => {
    const { hub, items, token, id } = await fixture()
    const first = new TestPeer('first')
    const second = new TestPeer('second')
    const client = new Y.Doc()
    try {
      await Promise.all([hub.connect(first.asPeer(), id, token), hub.connect(second.asPeer(), id, token)])
      expect(items.saves).toBe(1)
      await hub.message(first.asPeer(), syncRequest(client))
      applyMessages(first, client)
      expect(documentMarkdown(client)).toContain('# Hello')
      const before = Y.encodeStateVector(client)
      const text = client.getXmlFragment('default').get(0) as Y.XmlElement
      const heading = text.get(0) as Y.XmlText
      heading.insert(heading.length, ' from client')
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, 0)
      sync.writeUpdate(encoder, Y.encodeStateAsUpdate(client, before))
      await hub.message(first.asPeer(), encoding.toUint8Array(encoder))
      expect(items.markdown).toContain('Hello from client')
      const other = new Y.Doc()
      await hub.message(second.asPeer(), syncRequest(other))
      applyMessages(second, other)
      expect(documentMarkdown(other)).toContain('Hello from client')
      other.destroy()
      await Promise.all([hub.disconnect(first.asPeer()), hub.disconnect(second.asPeer())])
      const third = new TestPeer('third')
      await hub.connect(third.asPeer(), id, token)
      const restored = createDocument('', items.state)
      expect(documentMarkdown(restored)).toContain('Hello from client')
      restored.destroy()
    } finally {
      client.destroy()
      await hub.close()
    }
  })
  test('revokes connected users and rejects an expired session', async () => {
    const { hub, auth, token, id } = await fixture()
    const peer = new TestPeer('owner')
    try {
      await hub.connect(peer.asPeer(), id, token)
      await auth.logout(token)
      await expect(hub.message(peer.asPeer(), syncRequest(new Y.Doc()))).rejects.toMatchObject({ code: 'unauthenticated' })
      await hub.evict(id)
      expect(peer.closed).toBe(1008)
    } finally {
      await hub.close()
    }
  })
  test('workspace revalidation keeps authorized editors connected and closes revoked members', async () => {
    const { hub, token, id, accounts, memberships } = await fixture()
    const peer = new TestPeer('revoked-member')
    try {
      await hub.connect(peer, id, token)
      await hub.revalidateWorkspace(WORKSPACE_ID)
      expect(peer.closed).toBeUndefined()
      memberships.membership.delete(accounts.account.id)
      await hub.revalidateWorkspace(WORKSPACE_ID)
      expect(peer.closed).toBe(1008)
      await expect(hub.connect(new TestPeer('replay'), id, token)).rejects.toMatchObject({ code: 'not_found' })
    } finally {
      await hub.close()
    }
  })
  test('pushes comment changes only to authorized viewers in the matching room without modifying the document', async () => {
    const { hub, token, id, items, auth } = await fixture()
    const first = new TestPeer('comments-first')
    const second = new TestPeer('comments-second')
    const eventType = (message: Uint8Array) => decoding.readVarUint(decoding.createDecoder(message))
    try {
      await Promise.all([hub.connect(first, id, token), hub.connect(second, id, token)])
      first.messages = []
      second.messages = []
      const saves = items.saves
      await hub.commentsChanged('unrelated-item')
      expect(first.messages).toHaveLength(0)
      await hub.commentsChanged(id)
      expect(first.messages.map(eventType)).toEqual([COMMENTS_CHANGED])
      expect(second.messages.map(eventType)).toEqual([COMMENTS_CHANGED])
      expect(first.messages[0]?.length).toBe(1)
      expect(items.saves).toBe(saves)
      first.messages = []
      second.messages = []
      await auth.logout(token)
      await hub.commentsChanged(id)
      expect(first.messages).toHaveLength(0)
      expect(second.messages).toHaveLength(0)
      expect(first.closed).toBe(1008)
    } finally {
      await hub.close()
    }
  })
  test('clients cannot forge comment invalidation messages', async () => {
    const { hub, token, id } = await fixture()
    const sender = new TestPeer('forger')
    const viewer = new TestPeer('viewer')
    try {
      await Promise.all([hub.connect(sender, id, token), hub.connect(viewer, id, token)])
      viewer.messages = []
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, COMMENTS_CHANGED)
      await hub.message(sender, encoding.toUint8Array(encoder))
      expect(sender.closed).toBe(1003)
      expect(viewer.messages).toHaveLength(0)
    } finally {
      await hub.close()
    }
  })
  test('replaces Markdown in a live room and persists the matching document state', async () => {
    const { hub, items, token, id } = await fixture()
    const peer = new TestPeer('editor')
    try {
      await hub.connect(peer.asPeer(), id, token)
      await hub.replaceMarkdown(id, '# Replacement\n\nA new **document**.')
      const restored = createDocument('', items.state)
      expect(documentMarkdown(restored)).toContain('# Replacement')
      expect(items.markdown).toContain('**document**')
      restored.destroy()
    } finally {
      await hub.close()
    }
  })
  test('replaces an offline document through the same writer and retains it on reconnect', async () => {
    const { hub, items, token, id } = await fixture()
    const peer = new TestPeer('reconnecting-editor')
    try {
      await hub.replaceMarkdown(id, '# Offline replacement\n\n**Preserved formatting**')
      expect(items.state).not.toBeNull()
      const before = items.markdown
      await hub.connect(peer, id, token)
      const restored = createDocument('', items.state)
      try {
        expect(documentMarkdown(restored)).toBe(before)
        expect(before).toContain('**Preserved formatting**')
      } finally {
        restored.destroy()
      }
    } finally {
      await hub.close()
    }
  })
  test('concurrent replacements leave Markdown and Yjs state in agreement', async () => {
    const { hub, items, id } = await fixture()
    try {
      await Promise.all([hub.replaceMarkdown(id, '# First'), hub.replaceMarkdown(id, '# Second')])
      const restored = createDocument('', items.state)
      try {
        expect(items.markdown).toBe('# Second')
        expect(documentMarkdown(restored)).toBe(items.markdown)
      } finally {
        restored.destroy()
      }
    } finally {
      await hub.close()
    }
  })
  test('offline replacement reports persistence failures and can retry with a new room', async () => {
    const { hub, items, id } = await fixture()
    try {
      items.failSave = true
      await expect(hub.replaceMarkdown(id, '# Unavailable')).rejects.toThrow('Disk unavailable')
      items.failSave = false
      await hub.replaceMarkdown(id, '# Retried')
      expect(items.markdown).toBe('# Retried')
      expect(items.state).not.toBeNull()
    } finally {
      await hub.close()
    }
  })
})
