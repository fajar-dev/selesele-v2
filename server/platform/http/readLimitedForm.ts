import { getRequestHeader, getRequestWebStream } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
import { ApplicationError } from '../../core/errors/ApplicationError'

export async function readLimitedForm(event: H3Event, maximum: number) {
  const contentType = getRequestHeader(event, 'content-type') || ''
  if (!contentType.startsWith('multipart/form-data')) {
    throw new ApplicationError('invalid_input', 'Use a file upload form')
  }
  const stream = getRequestWebStream(event)
  if (!stream) {
    throw new ApplicationError('invalid_input', 'Upload body is missing')
  }
  const reader = stream.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      size += value.byteLength
      if (size > maximum) {
        await reader.cancel()
        throw new ApplicationError('invalid_input', 'Upload exceeds the 10 MB limit')
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return await new Response(bytes, { headers: { 'content-type': contentType } }).formData()
  } finally {
    reader.releaseLock()
  }
}
