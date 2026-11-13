import type { CommentEvents } from '../../features/comments/domain/CommentEvents'
import type { CollaborationPeer } from './CollaborationPeer'
import * as Y from 'yjs'
import type { SessionAuthenticator } from '../../features/identity/domain/SessionAuthenticator'
import type { PageAccess } from '../../features/pages/domain/PageAccess'
import type { DocumentRepository } from '../../features/pages/domain/DocumentRepository'
import type { DocumentEditor } from '../../features/pages/domain/DocumentEditor'
import { ApplicationError } from '../../core/errors/ApplicationError'
import type { CollaborationConnection } from './CollaborationRoom'
import { CollaborationRoom } from './CollaborationRoom'
import { createDocument } from './document'

/** Owns room lifecycles within one Bun application process. */
export class CollaborationHub implements CommentEvents, DocumentEditor {
  private readonly rooms = new Map<string, Promise<CollaborationRoom>>()
  private readonly peerRooms = new Map<string, string>()
  private readonly roomWorkspaces = new Map<string, string>()
  private closed = false

  constructor(
    private readonly pages: PageAccess,
    private readonly auth: SessionAuthenticator,
    private readonly documents: DocumentRepository
  ) {}

  async connect(peer: CollaborationPeer, id: string, token: string): Promise<void> {
    while (!this.closed) {
      const user = await this.auth.authenticate(token)
      const page = await this.pages.get(id, user.id)
      this.roomWorkspaces.set(id, page.workspaceId)
      const loading = this.getRoom(id)
      const room = await loading

      if (room.isClosing) {
        await this.disposeRoom(id, loading)
        continue
      }

      try {
        await this.authorize({ token, userId: user.id }, id)
      } catch (error) {
        if (!room.connections.size) {
          await this.disposeRoom(id, loading)
        }
        throw error
      }

      if (room.isClosing) {
        continue
      }
      this.peerRooms.set(peer.id, id)
      room.add({ peer, token, userId: user.id, clients: new Set() })
      return
    }

    throw new ApplicationError('unavailable', 'Collaboration server is shutting down')
  }

  async message(peer: CollaborationPeer, data: Uint8Array): Promise<void> {
    const id = this.peerRooms.get(peer.id)
    const room = id ? await this.rooms.get(id) : undefined

    if (!room) {
      peer.close(1008, 'Not authenticated')
      return
    }

    await room.receive(peer, data)
  }

  async disconnect(peer: CollaborationPeer): Promise<void> {
    const id = this.peerRooms.get(peer.id)
    this.peerRooms.delete(peer.id)
    if (!id) {
      return
    }

    const loading = this.rooms.get(id)
    if (!loading) {
      return
    }

    const room = await loading
    room.remove(peer)
    if (!room.connections.size) {
      await this.disposeRoom(id, loading)
    }
  }

  async commentsChanged(pageId: string): Promise<void> {
    const loading = this.rooms.get(pageId)
    if (!loading) {
      return
    }
    // A failed socket must not turn an already committed comment into a failed POST.
    // Reconnecting viewers fetch the latest snapshot when document sync completes.
    try {
      const room = await loading
      if (!room.isClosing) {
        await room.notifyCommentsChanged()
      }
    } catch (cause) {
      console.error('Unable to notify comment viewers', cause)
    }
  }

  async replaceMarkdown(id: string, content: string, userId?: string): Promise<void> {
    while (!this.closed) {
      const loading = this.getRoom(id)
      const room = await loading
      if (room.isClosing) {
        await this.disposeRoom(id, loading)
        continue
      }
      try {
        await room.replaceMarkdown(content, userId)
      } finally {
        if (!room.connections.size) {
          await this.disposeRoom(id, loading)
        }
      }
      return
    }
    throw new ApplicationError('unavailable', 'Collaboration server is shutting down')
  }

  async evict(id?: string, userId?: string, token?: string): Promise<void> {
    for (const [roomId, loading] of this.rooms) {
      if (!id || roomId === id) {
        (await loading).evict(userId, token)
      }
    }
  }

  async evictWorkspace(workspaceId: string, userId?: string): Promise<void> {
    for (const [id, loading] of this.rooms) {
      if (this.roomWorkspaces.get(id) === workspaceId) {
        (await loading).evict(userId)
      }
    }
  }

  async revalidateWorkspace(workspaceId: string): Promise<void> {
    for (const [id, loading] of this.rooms) {
      if (this.roomWorkspaces.get(id) !== workspaceId) {
        continue
      }
      const room = await loading
      for (const connection of room.connections.values()) {
        try {
          await this.authorize(connection, id)
        } catch {
          connection.peer.close(1008, 'Access expired or revoked')
        }
      }
    }
  }

  async close(): Promise<void> {
    this.closed = true
    const results = await Promise.allSettled([...this.rooms.values()].map(async (loading) => {
      const room = await loading
      room.evict()
      await room.close()
    }))
    this.rooms.clear()
    this.peerRooms.clear()
    this.roomWorkspaces.clear()

    const failures = results.filter(result => result.status === 'rejected')
    if (failures.length) {
      throw new AggregateError(failures.map(result => result.reason), 'Unable to flush collaboration rooms')
    }
  }

  private async authorize(connection: Pick<CollaborationConnection, 'token' | 'userId'>, id: string): Promise<void> {
    const user = await this.auth.authenticate(connection.token)
    await this.pages.writable(id, user.id)
  }

  private getRoom(id: string): Promise<CollaborationRoom> {
    let loading = this.rooms.get(id)
    if (!loading) {
      loading = this.createRoom(id)
      this.rooms.set(id, loading)
      void loading.catch(() => {
        if (this.rooms.get(id) === loading) {
          this.rooms.delete(id)
        }
      })
    }
    return loading
  }

  private async createRoom(id: string): Promise<CollaborationRoom> {
    const state = await this.documents.readState(id)
    const content = state ? '' : await this.documents.readContent(id)
    const document = createDocument(content, state)

    try {
      if (!state) {
        await this.documents.saveState(id, Y.encodeStateAsUpdate(document), content)
      }
      return new CollaborationRoom(id, document, this.documents, connection => this.authorize(connection, id))
    } catch (error) {
      document.destroy()
      throw error
    }
  }

  private async disposeRoom(id: string, loading: Promise<CollaborationRoom>): Promise<void> {
    try {
      await (await loading).close()
    } finally {
      if (this.rooms.get(id) === loading) {
        this.rooms.delete(id)
        this.roomWorkspaces.delete(id)
      }
    }
  }
}
