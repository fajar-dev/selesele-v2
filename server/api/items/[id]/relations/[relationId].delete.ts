import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  await getApplication().services.itemResources.unlink(idSchema.parse(getRouterParam(event, 'id')), idSchema.parse(getRouterParam(event, 'relationId')), currentUser(event).id)
  return success(null)
})
