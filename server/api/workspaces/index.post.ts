import { readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../container'
import { apiHandler, success } from '../../http/response'
import { currentUser } from '../../http/session'
import { workspaceInputSchema } from '../../http/schemas'

export default apiHandler(async (event) => {
  const input = workspaceInputSchema.parse(await readBody(event))
  const workspace = await getContainer().workspaces.create(input, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(workspace)
})
