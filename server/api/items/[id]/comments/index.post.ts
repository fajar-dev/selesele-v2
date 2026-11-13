import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { commentThreadSchema } from '../../../../../shared/validation/comment'

export default apiHandler(async (event) => {
  const itemId = idSchema.parse(getRouterParam(event, 'id'))
  const input = commentThreadSchema.parse(await readBody(event))
  const thread = await getContainer().comments.create(itemId, input, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(thread)
})
