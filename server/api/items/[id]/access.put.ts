import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { resourcePolicySchema } from '../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getContainer()
  const actor = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const policy = await app.resources.policy('item', id, actor)
  await app.resources.save('item', id, actor, resourcePolicySchema.parse(await readBody(event)))
  await app.invalidateWorkspace(policy.workspaceId)
  return success(null)
})
