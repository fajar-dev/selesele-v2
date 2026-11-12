import { readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../bootstrap/container'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'
import { workspaceInputSchema } from '../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const input = workspaceInputSchema.parse(await readBody(event))
  const workspace = await getContainer().workspaces.create(input, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(workspace)
})
