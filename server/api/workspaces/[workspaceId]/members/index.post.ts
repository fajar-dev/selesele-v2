import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { addMembersSchema } from '../../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getContainer()
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const actor = currentUser(event).id
  const result = await app.members.add(id, actor, addMembersSchema.parse(await readBody(event)))
  await app.invalidateWorkspace(id)
  setResponseStatus(event, 201)
  return success(result)
})
