import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { itemUpdateSchema } from '../../../../shared/validation/item'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const input = itemUpdateSchema.parse(await readBody(event))
  const result = await getContainer().items.update(id, input, currentUser(event).id)
  return success(result ?? null, 'Item updated successfully')
})
