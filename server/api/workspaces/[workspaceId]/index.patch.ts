import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler, success } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema, workspaceUpdateSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  return success(await getContainer().workspaces.update(id, workspaceUpdateSchema.parse(await readBody(event)), currentUser(event).id))
})
