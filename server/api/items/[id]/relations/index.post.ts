import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { relationSchema } from '../../../../../shared/validation/itemResources'

export default apiHandler(async (event) => {
  await getApplication().services.itemResources.relate(idSchema.parse(getRouterParam(event, 'id')), currentUser(event).id, relationSchema.parse(await readBody(event)))
  return success(null)
})
