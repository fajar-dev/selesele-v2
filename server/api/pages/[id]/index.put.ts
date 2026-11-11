import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler, success } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema, pageUpdateSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const input = pageUpdateSchema.parse(await readBody(event))
  const result = await getContainer().pages.update(id, input, currentUser(event).id)
  return success(result ?? null, 'Page updated successfully')
})
