import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler, success } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'invitationId'))
  return success(await getContainer().workspaces.accept(id, currentUser(event)))
})
