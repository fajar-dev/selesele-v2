import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../container'
import { apiHandler, success } from '../../../../http/response'
import { currentUser } from '../../../../http/session'
import { idSchema, folderInputSchema } from '../../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const folderId = idSchema.parse(getRouterParam(event, 'folderId'))
  const { name } = folderInputSchema.parse(await readBody(event))
  await getContainer().folders.rename(id, folderId, name, currentUser(event).id)
  return success(null)
})
