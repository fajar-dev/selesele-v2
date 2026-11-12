import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const target = idSchema.parse(getRouterParam(event, 'userId'))
  await getContainer().memberships.remove(id, target, currentUser(event).id)
  await getContainer().collaboration.evictWorkspace(id, target)
  return success(null)
})
