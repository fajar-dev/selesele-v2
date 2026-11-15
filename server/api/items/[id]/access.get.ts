import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const app = getApplication().services
  const actor = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const policy = await app.access.policy('item', id, actor)
  return success(policy)
})
