import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const folderId = idSchema.parse(getRouterParam(event, 'folderId'))
  await getContainer().folders.delete(id, folderId, currentUser(event).id)
  await getContainer().collaboration.evictWorkspace(id)
  return success(null)
})
