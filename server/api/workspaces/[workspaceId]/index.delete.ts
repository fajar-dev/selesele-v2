import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler, success } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  await getContainer().workspaces.delete(id, currentUser(event).id)
  await getContainer().collaboration.evictWorkspace(id)
  return success(null)
})
