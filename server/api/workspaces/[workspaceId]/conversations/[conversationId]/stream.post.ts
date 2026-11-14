import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'
import { conversationQuestionSchema } from '../../../../../../shared/validation/knowledge'

export default apiHandler(async (event) => {
  const service = getContainer().conversations
  const userId = currentUser(event).id
  const workspaceId = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const id = idSchema.parse(getRouterParam(event, 'conversationId'))
  const input = conversationQuestionSchema.parse(await readBody(event))
  await service.get(workspaceId, userId, id)
  const abort = new AbortController()
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (value: unknown) => {
        if (!abort.signal.aborted) {
          controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`))
        }
      }
      void service.ask(workspaceId, userId, id, input.question, input.revision, async (text) => {
        abort.signal.throwIfAborted()
        send({ type: 'delta', text })
      }, abort.signal).then(conversation => send({ type: 'done', conversation })).catch(() => {
        send({ type: 'error', message: 'Unable to complete this answer. Retry your question.' })
      }).finally(() => {
        if (!abort.signal.aborted) {
          controller.close()
        }
      })
    },
    cancel() {
      abort.abort()
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
})
