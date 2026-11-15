import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  await getApplication().services.itemResources.removeSearch(currentUser(event).id, idSchema.parse(getRouterParam(event, 'searchId')))
  return success(null)
})
