import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { groupInputSchema } from '../../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getContainer()
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const actor = currentUser(event).id
  const groupId = idSchema.parse(getRouterParam(event, 'groupId'))
  await app.members.saveGroup(id, actor, groupId, groupInputSchema.parse(await readBody(event)))
  await app.invalidateWorkspace(id)
  return success(null)
})
