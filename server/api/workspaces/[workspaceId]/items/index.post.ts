import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { itemInputSchema } from '../../../../../shared/validation/item'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const item = await getApplication().services.items.create(id, itemInputSchema.parse(await readBody(event)), currentUser(event).id)
  setResponseStatus(event, 201)
  return success(item)
})
