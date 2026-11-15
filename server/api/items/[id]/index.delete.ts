import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const result = await getApplication().services.items.delete(id, currentUser(event).id)
  await getApplication().services.collaboration.evict(id)
  return success(result ?? null, 'Item deleted successfully')
})
