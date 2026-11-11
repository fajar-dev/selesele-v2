import { getRouterParam, setHeader } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const content = await getContainer().pages.content(id, currentUser(event).id)
  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${id}.md"`)
  return content
})
