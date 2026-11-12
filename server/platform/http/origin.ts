import { getHeader, getRequestURL } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
import { ApplicationError } from '../../core/errors/ApplicationError'

export function assertSameOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  const expected = process.env.APP_ORIGIN || getRequestURL(event).origin
  if ((origin && origin !== expected) || getHeader(event, 'sec-fetch-site') === 'cross-site') {
    throw new ApplicationError('forbidden', 'Cross-origin request rejected')
  }
}
