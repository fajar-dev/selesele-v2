import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const app = getContainer()
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const actor = currentUser(event).id
  const memberId = idSchema.parse(getRouterParam(event, 'memberId'))
  return success(await app.members.detail(id, actor, memberId))
})
