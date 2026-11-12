import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const invitationId = idSchema.parse(getRouterParam(event, 'invitationId'))
  await getContainer().invitations.cancel(id, invitationId, currentUser(event).id)
  return success(null)
})
