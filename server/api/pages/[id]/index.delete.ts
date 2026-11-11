import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler, success } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const result = await getContainer().pages.delete(id, currentUser(event).id)
  await getContainer().collaboration.evict(id)
  return success(result ?? null, 'Page deleted successfully')
})
