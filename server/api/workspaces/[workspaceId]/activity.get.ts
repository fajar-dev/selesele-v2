import { getRouterParam, getQuery } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const userId = currentUser(event).id
  const cursor = getQuery(event).cursor
  return success(await getApplication().services.settings.activity(id, userId, cursor ? idSchema.parse(cursor) : undefined))
})
