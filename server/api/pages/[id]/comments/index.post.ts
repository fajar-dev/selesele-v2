import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../container'
import { apiHandler, success } from '../../../../http/response'
import { currentUser } from '../../../../http/session'
import { idSchema } from '../../../../http/schemas'
import { commentThreadSchema } from '../../../../../shared/validation/comment'

export default apiHandler(async (event) => {
  const pageId = idSchema.parse(getRouterParam(event, 'id'))
  const input = commentThreadSchema.parse(await readBody(event))
  const thread = await getContainer().comments.create(pageId, input, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(thread)
})
