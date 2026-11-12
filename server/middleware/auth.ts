import { getContainer } from '../bootstrap/container'
import { apiHandler } from '../platform/http/response'
import { assertSameOrigin } from '../platform/http/origin'
import { sessionToken } from '../platform/http/session'
import { getRequestURL, setHeader } from '@nuxt/nitro-server/h3'

export default apiHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) {
    return
  }
  setHeader(event, 'Cache-Control', 'no-store')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(event.method)) {
    assertSameOrigin(event)
  }
  if (['/api/auth/microsoft', '/api/auth/microsoft/callback'].includes(path) || path === '/api/health') {
    return
  }
  event.context.user = await getContainer().auth.authenticate(sessionToken(event))
})
