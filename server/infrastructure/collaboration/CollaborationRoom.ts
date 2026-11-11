import * as Y from 'yjs'
import * as sync from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import type { CollaborationPeer } from '../../domain/ports/CollaborationPeer'
import type { DocumentRepository } from '../../domain/ports/DocumentRepository'
import { createDocument, documentMarkdown } from './document'

const SYNC = 0
const AWARENESS = 1
const MAX_MESSAGE_BYTES = 2 * 1024 * 1024

export interface CollaborationConnection {
  peer: CollaborationPeer
  token: string
  userId: string
  clients: Set<number>
}

export class CollaborationRoom {
  readonly connections = new Map<string, CollaborationConnection>()
  private closing: Promise<void> | undefined
  private readonly awareness: awarenessProtocol.Awareness
  private pending: Promise<void> = Promise.resolve()
  private readonly timer: ReturnType<typeof setInterval>

  constructor(readonly id: string, private readonly document: Y.Doc,
    private readonly repository: DocumentRepository, private readonly authorize: (connection: CollaborationConnection) => Promise<void>) {
    this.awareness = new awarenessProtocol.Awareness(document)
    this.awareness.setLocalState(null)
    document.on('update', (update: Uint8Array) => {
      const state = Y.encodeStateAsUpdate(document)
      const content = documentMarkdown(document)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, SYNC)
      sync.writeUpdate(encoder, update)
      const message = encoding.toUint8Array(encoder)
      // Persist snapshots serially before acknowledging them to other clients.
      this.pending = this.pending.then(async () => {
        await this.repository.saveState(id, state, content)
        this.broadcast(message)
      })
      void this.pending.catch((error: unknown) => {
        console.error('Collaboration persistence failed', error)
        for (const { peer } of this.connections.values()) {
          peer.close(1011, 'Unable to save document')
        }
      })
    })
    this.awareness.on('update', ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }, origin: unknown) => {
      const connection = typeof origin === 'string' ? this.connections.get(origin) : undefined
      for (const id of [...added, ...updated]) {
        connection?.clients.add(id)
      }
      for (const id of removed) {
        connection?.clients.delete(id)
      }
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, AWARENESS)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [...added, ...updated, ...removed]))
      this.broadcast(encoding.toUint8Array(encoder))
    })
    this.timer = setInterval(() => {
      for (const connection of this.connections.values()) {
        void this.authorize(connection).catch(() => connection.peer.close(1008, 'Access expired or revoked'))
      }
    }, 30000)
    this.timer.unref?.()
  }

  private broadcast(message: Uint8Array) {
    for (const { peer } of this.connections.values()) {
      peer.send(message)
    }
  }

  add(connection: CollaborationConnection) {
    this.connections.set(connection.peer.id, connection)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, SYNC)
    sync.writeSyncStep1(encoder, this.document)
    connection.peer.send(encoding.toUint8Array(encoder))
    if (this.awareness.getStates().size) {
      const awareness = encoding.createEncoder()
      encoding.writeVarUint(awareness, AWARENESS)
      encoding.writeVarUint8Array(awareness, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [...this.awareness.getStates().keys()]))
      connection.peer.send(encoding.toUint8Array(awareness))
    }
  }

  async receive(peer: CollaborationPeer, data: Uint8Array) {
    const connection = this.connections.get(peer.id)
    if (!connection || data.length > MAX_MESSAGE_BYTES) {
      peer.close(1009, 'Invalid message size')
      return
    }
    await this.authorize(connection)
    const decoder = decoding.createDecoder(data)
    const type = decoding.readVarUint(decoder)
    if (type === SYNC) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, SYNC)
      sync.readSyncMessage(decoder, encoder, this.document, peer.id)
      await this.pending
      if (encoding.length(encoder) > 1) {
        peer.send(encoding.toUint8Array(encoder))
      }
    } else if (type === AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), peer.id)
    } else {
      peer.close(1003, 'Unsupported protocol message')
    }
  }

  async replaceMarkdown(content: string) {
    const source = createDocument(content, null)
    try {
      const fragment = this.document.getXmlFragment('default')
      const nodes = source.getXmlFragment('default').toArray()
        .filter((node): node is Y.XmlElement | Y.XmlText => node instanceof Y.XmlElement || node instanceof Y.XmlText)
        .map(node => node.clone())
      this.document.transact(() => {
        fragment.delete(0, fragment.length)
        fragment.insert(0, nodes)
      })
      await this.pending
    } finally {
      source.destroy()
    }
  }

  remove(peer: CollaborationPeer) {
    const connection = this.connections.get(peer.id)
    if (!connection) {
      return
    }
    this.connections.delete(peer.id)
    awarenessProtocol.removeAwarenessStates(this.awareness, [...connection.clients], null)
  }

  get isClosing(): boolean {
    return !!this.closing
  }

  close(): Promise<void> {
    return this.closing ??= this.destroy()
  }

  private async destroy(): Promise<void> {
    clearInterval(this.timer)
    try {
      await this.pending
    } finally {
      this.awareness.destroy()
      this.document.destroy()
    }
  }

  evict(userId?: string, token?: string) {
    for (const connection of [...this.connections.values()]) {
      if ((!userId || connection.userId === userId) && (!token || connection.token === token)) {
        this.remove(connection.peer)
        connection.peer.close(1008, 'Access revoked')
      }
    }
  }
}
