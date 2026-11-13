import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const userId = currentUser(event).id
  await getContainer().settings.leave(id, userId)
  getContainer().notificationEvents.changed(userId)
  await getContainer().invalidateWorkspace(id)
  return success(null)
})
