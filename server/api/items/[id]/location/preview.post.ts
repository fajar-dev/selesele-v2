import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { itemLocationSchema } from '../../../../../shared/validation/item'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const { folderId } = itemLocationSchema.parse(await readBody(event))
  const container = getContainer()
  return success(await container.items.previewMove(id, folderId, currentUser(event).id))
})
