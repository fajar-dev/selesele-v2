import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  await getApplication().services.recovery.checkpoint(userId, idSchema.parse(getRouterParam(event, 'id')))
  return success(null)
})
