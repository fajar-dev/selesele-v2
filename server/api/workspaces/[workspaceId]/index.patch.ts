import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema, workspaceUpdateSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  return success(await getApplication().services.workspaces.update(id, workspaceUpdateSchema.parse(await readBody(event)), currentUser(event).id))
})
