import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema, folderInputSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const folderId = idSchema.parse(getRouterParam(event, 'folderId'))
  const { name } = folderInputSchema.parse(await readBody(event))
  await getContainer().folders.rename(id, folderId, name, currentUser(event).id)
  return success(null)
})
