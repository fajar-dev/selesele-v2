import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../container'
import { apiHandler, success } from '../../../../http/response'
import { currentUser } from '../../../../http/session'
import { idSchema, invitationInputSchema } from '../../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const { email, role } = invitationInputSchema.parse(await readBody(event))
  await getContainer().workspaces.invite(id, email, role, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(null)
})
