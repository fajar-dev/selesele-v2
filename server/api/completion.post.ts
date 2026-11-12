import { readBody } from '@nuxt/nitro-server/h3'
import { completionSchema } from '../../shared/validation/completion'
import { getContainer } from '../bootstrap/container'
import { apiHandler } from '../platform/http/response'

export default apiHandler(async (event) => {
  const request = completionSchema.parse(await readBody(event))
  const stream = getContainer().completions.stream(request)

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  })
})
