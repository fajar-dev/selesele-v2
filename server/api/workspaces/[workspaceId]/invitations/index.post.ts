import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema, invitationInputSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const { email, role } = invitationInputSchema.parse(await readBody(event))
  await getContainer().invitations.invite(id, email, role, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(null)
})
