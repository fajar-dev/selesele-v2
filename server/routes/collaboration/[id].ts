import { defineWebSocketHandler } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../bootstrap/container'
import { idSchema } from '../../../shared/validation/workspace'
import { SESSION_COOKIE } from '../../platform/http/session'

const connections = new Map<string, Promise<void>>()
export default defineWebSocketHandler({
  async upgrade(request) {
    const url = new URL(request.url)
    const origin = request.headers.get('origin')
    if (origin !== (process.env.APP_ORIGIN || url.origin)) {
      return new Response('Forbidden', { status: 403 })
    }
    const id = idSchema.safeParse(url.pathname.split('/').pop())
    if (!id.success) {
      return new Response('Invalid item ID', { status: 400 })
    }
    const token = request.headers.get('cookie')?.split(';').map(part => part.trim())
      .find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1)
    try {
      const user = await getContainer().auth.authenticate(token)
      await getContainer().items.get(id.data, user.id)
      request.context.itemId = id.data
      request.context.sessionToken = token
    } catch {
      return new Response('Unauthorized', { status: 401 })
    }
  },
  async open(peer) {
    try {
      const connecting = getContainer().collaboration.connect(peer, peer.context.itemId as string, peer.context.sessionToken as string)
      connections.set(peer.id, connecting)
      await connecting
    } catch {
      peer.close(1008, 'Access denied')
    }
  },
  async message(peer, message) {
    try {
      await connections.get(peer.id)
      await getContainer().collaboration.message(peer, message.uint8Array())
    } catch {
      peer.close(1008, 'Invalid message or access revoked')
    }
  },
  async close(peer) {
    await connections.get(peer.id)?.catch(() => {
    })
    connections.delete(peer.id)
    await getContainer().collaboration.disconnect(peer)
  },
  async error(peer) {
    await connections.get(peer.id)?.catch(() => {
    })
    connections.delete(peer.id)
    await getContainer().collaboration.disconnect(peer)
  }
})
