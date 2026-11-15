import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const app = getApplication().services, id = idSchema.parse(getRouterParam(event, 'id'))
  await app.items.get(id, currentUser(event).id)
  return success(await app.presence.list(id))
})
