import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const folderId = idSchema.parse(getRouterParam(event, 'folderId'))
  await getApplication().services.folders.delete(id, folderId, currentUser(event).id)
  return success(null)
})
