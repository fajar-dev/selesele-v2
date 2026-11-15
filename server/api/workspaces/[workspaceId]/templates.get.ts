import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const container = getApplication().services
  const userId = currentUser(event).id
  const workspaceId = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const result = await container.templates.workspace(workspaceId, userId)
  return success(result ?? null)
})
