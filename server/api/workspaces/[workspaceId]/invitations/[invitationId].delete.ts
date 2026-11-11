import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../container'
import { apiHandler, success } from '../../../../http/response'
import { currentUser } from '../../../../http/session'
import { idSchema } from '../../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const invitationId = idSchema.parse(getRouterParam(event, 'invitationId'))
  await getContainer().workspaces.cancelInvitation(id, invitationId, currentUser(event).id)
  return success(null)
})
