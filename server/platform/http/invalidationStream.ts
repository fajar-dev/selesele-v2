import type { InvalidationHub } from '../events/InvalidationHub'
/** Streams invalidations only; all content remains behind its authorized read endpoint. */
export function invalidationStream(hub: InvalidationHub, key: string, authorize: () => Promise<unknown>) {
  let dispose = () => { }
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
      const unsubscribe = hub.subscribe(key, () => send('data: refresh\n\n'), close)
      const timer = setInterval(async () => {
        try {
          await authorize()
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
}
