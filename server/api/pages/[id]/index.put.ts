import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { pageUpdateSchema } from '../../../../shared/validation/page'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const input = pageUpdateSchema.parse(await readBody(event))
  const result = await getContainer().pages.update(id, input, currentUser(event).id)
  return success(result ?? null, 'Page updated successfully')
})
