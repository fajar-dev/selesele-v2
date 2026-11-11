import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../container'
import { apiHandler, success } from '../../../../http/response'
import { currentUser } from '../../../../http/session'
import { idSchema } from '../../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const target = idSchema.parse(getRouterParam(event, 'userId'))
  await getContainer().workspaces.removeMember(id, target, currentUser(event).id)
  await getContainer().collaboration.evictWorkspace(id, target)
  return success(null)
})
