import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema, folderInputSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const { name } = folderInputSchema.parse(await readBody(event))
  const folder = await getContainer().folders.create(id, name, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(folder)
})
