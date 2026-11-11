import { getContainer } from '../../container'
import { getRouterParam, setHeader } from '@nuxt/nitro-server/h3'
import { apiHandler } from '../../http/response'

export default apiHandler(async (event) => {
  const image = await getContainer().images.get(getRouterParam(event, 'pathname') || '')
  setHeader(event, 'Content-Type', image.type)
  setHeader(event, 'Content-Security-Policy', 'default-src \'none\'')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return image.data
})
