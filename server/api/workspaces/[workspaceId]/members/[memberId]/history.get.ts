import { getRouterParam, getQuery } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../../bootstrap/application'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const app = getApplication().services
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const actor = currentUser(event).id
  const memberId = idSchema.parse(getRouterParam(event, 'memberId'))
  const cursor = getQuery(event).cursor
  return success(await app.settings.activity(id, actor, cursor ? idSchema.parse(cursor) : undefined, memberId))
})
