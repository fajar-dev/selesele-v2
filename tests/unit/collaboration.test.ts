import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'
import * as sync from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { AuthService } from '../../server/application/AuthService'
import { WorkspaceService } from '../../server/application/WorkspaceService'
import { FolderService } from '../../server/application/FolderService'
import { PageService } from '../../server/application/PageService'
import { CollaborationHub } from '../../server/infrastructure/collaboration/CollaborationHub'
import { createDocument, documentMarkdown } from '../../server/infrastructure/collaboration/document'
import { MemoryAccounts, MemoryPages, MemoryWorkspaces, MemoryFolders, WORKSPACE_ID } from '../support/fakes'

class TestPeer {
  messages: Uint8Array[] = []
  closed: number | undefined
  constructor(readonly id: string) {}
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
  const auth = new AuthService(accounts, accounts)
  const { token } = await auth.login(await accounts.verify(), null)
  const pages = new MemoryPages()
  const memberships = new MemoryWorkspaces()
  const workspaces = new WorkspaceService(memberships)
  const folders = new FolderService(new MemoryFolders(), workspaces)
  const hub = new CollaborationHub(new PageService(pages, pages, workspaces, folders), auth, pages)
  return { accounts, auth, token, pages, hub, memberships, id: pages.page.id }
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
    const { hub, pages, token, id } = await fixture()
    const first = new TestPeer('first')
    const second = new TestPeer('second')
    const client = new Y.Doc()
    try {
      await Promise.all([hub.connect(first.asPeer(), id, token), hub.connect(second.asPeer(), id, token)])
      expect(pages.saves).toBe(1)
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
      expect(pages.markdown).toContain('Hello from client')
      const other = new Y.Doc()
      await hub.message(second.asPeer(), syncRequest(other))
      applyMessages(second, other)
      expect(documentMarkdown(other)).toContain('Hello from client')
      other.destroy()
      await Promise.all([hub.disconnect(first.asPeer()), hub.disconnect(second.asPeer())])
      const third = new TestPeer('third')
      await hub.connect(third.asPeer(), id, token)
      const restored = createDocument('', pages.state)
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
      await expect(hub.message(peer.asPeer(), syncRequest(new Y.Doc()))).rejects.toMatchObject({ statusCode: 401 })
      await hub.evict(id)
      expect(peer.closed).toBe(1008)
    } finally {
      await hub.close()
    }
  })

  test('workspace revocation disconnects all page rooms for that workspace member', async () => {
    const { hub, token, id, accounts, memberships } = await fixture()
    const peer = new TestPeer('revoked-member')
    try {
      await hub.connect(peer, id, token)
      memberships.membership.delete(accounts.account.id)
      await hub.evictWorkspace(WORKSPACE_ID, accounts.account.id)
      expect(peer.closed).toBe(1008)
      await expect(hub.connect(new TestPeer('replay'), id, token)).rejects.toMatchObject({ statusCode: 404 })
    } finally {
      await hub.close()
    }
  })

  test('replaces Markdown in a live room and persists the matching document state', async () => {
    const { hub, pages, token, id } = await fixture()
    const peer = new TestPeer('editor')
    try {
      await hub.connect(peer.asPeer(), id, token)
      await hub.replaceMarkdown(id, '# Replacement\n\nA new **document**.')
      const restored = createDocument('', pages.state)
      expect(documentMarkdown(restored)).toContain('# Replacement')
      expect(pages.markdown).toContain('**document**')
      restored.destroy()
    } finally {
      await hub.close()
    }
  })
})
