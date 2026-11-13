import { getContainer } from '../../bootstrap/container'
import { getRouterParam, setHeader } from '@nuxt/nitro-server/h3'
import { currentUser } from '../../platform/http/session'
import { apiHandler } from '../../platform/http/response'

export default apiHandler(async (event) => {
  const image = await getContainer().images.get(getRouterParam(event, 'pathname') || '', currentUser(event).id)
  setHeader(event, 'Content-Type', image.type)
  setHeader(event, 'Content-Security-Policy', 'default-src \'none\'')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'private, no-store')
  return image.data
})
