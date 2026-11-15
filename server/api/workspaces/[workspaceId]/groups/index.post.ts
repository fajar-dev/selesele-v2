import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { groupInputSchema } from '../../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getApplication().services
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const actor = currentUser(event).id
  await app.members.saveGroup(id, actor, null, groupInputSchema.parse(await readBody(event)))
  return success(null)
})
