import { getContainer } from '../container'
import { apiHandler } from '../http/response'
import { assertSameOrigin } from '../http/origin'
import { sessionToken } from '../http/session'
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
