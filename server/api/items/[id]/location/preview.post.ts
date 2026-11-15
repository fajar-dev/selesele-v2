import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { itemLocationSchema } from '../../../../../shared/validation/item'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const { folderId } = itemLocationSchema.parse(await readBody(event))
  const container = getApplication().services
  return success(await container.items.previewMove(id, folderId, currentUser(event).id))
})
