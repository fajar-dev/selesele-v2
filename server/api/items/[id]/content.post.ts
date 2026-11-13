import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { contentSchema } from '../../../../shared/validation/item'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const { content } = contentSchema.parse(await readBody(event))
  await getContainer().content.replace(id, content, currentUser(event).id)
  return success(null)
})
