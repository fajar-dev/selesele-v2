import { getRouterParam, getQuery } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { memberDirectorySchema } from '../../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getApplication().services
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const actor = currentUser(event).id
  return success(await app.members.directory(id, actor, memberDirectorySchema.parse(getQuery(event))))
})
