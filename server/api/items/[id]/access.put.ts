import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { resourcePolicySchema } from '../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getApplication().services
  const actor = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'id'))
  await app.access.save('item', id, actor, resourcePolicySchema.parse(await readBody(event)))
  return success(null)
})
