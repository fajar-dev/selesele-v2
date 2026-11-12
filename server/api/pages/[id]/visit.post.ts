import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  await getContainer().library.visit(userId, idSchema.parse(getRouterParam(event, 'id')))
  return success(null)
})
