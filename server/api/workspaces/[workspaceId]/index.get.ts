import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const workspaceId = idSchema.parse(getRouterParam(event, 'workspaceId'))
  return success(await getContainer().workspaces.get(workspaceId, currentUser(event).id))
})
