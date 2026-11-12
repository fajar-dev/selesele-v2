import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema, folderUpdateSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const folderId = idSchema.parse(getRouterParam(event, 'folderId'))
  const input = folderUpdateSchema.parse(await readBody(event))
  return success(await getContainer().folders.update(id, folderId, input, currentUser(event).id))
})
