import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  return success(await getContainer().recovery.version(userId, idSchema.parse(getRouterParam(event, 'id')), idSchema.parse(getRouterParam(event, 'versionId'))))
})
