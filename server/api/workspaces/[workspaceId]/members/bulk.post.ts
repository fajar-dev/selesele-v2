import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { bulkMembersSchema } from '../../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getApplication().services
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const actor = currentUser(event).id
  const result = await app.members.bulk(id, actor, bulkMembersSchema.parse(await readBody(event)))
  return success(result)
})
