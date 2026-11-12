import { getContainer } from '../../bootstrap/container'
import { apiHandler } from '../../platform/http/response'
import { currentUser, sessionToken } from '../../platform/http/session'

export default apiHandler(async (event) => {
  const container = getContainer()
  const userId = currentUser(event).id
  const token = sessionToken(event)
  let dispose = () => {}
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false
      const send = (message: string) => {
        if (!closed) {
          controller.enqueue(encoder.encode(message))
        }
      }
      const close = () => {
        if (closed) {
          return
        }
        dispose()
        controller.close()
      }
      const unsubscribe = container.notificationEvents.subscribe(userId, () => send('data: refresh\n\n'), close)
      const timer = setInterval(async () => {
        try {
          await container.auth.authenticate(token)
          send(': keepalive\n\n')
        } catch {
          close()
        }
      }, 20000)
      timer.unref?.()
      dispose = () => {
        closed = true
        clearInterval(timer)
        unsubscribe()
      }
      send('data: refresh\n\n')
    },
    cancel() {
      dispose()
    }
  })
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
})
