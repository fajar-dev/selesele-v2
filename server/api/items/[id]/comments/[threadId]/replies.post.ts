import { readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { commentBodySchema } from '../../../../../../shared/validation/comment'
import { getApplication } from '../../../../../bootstrap/application'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { commentRoute } from '../../../../../platform/http/comments'

export default apiHandler(async (event) => {
  const { itemId, threadId } = commentRoute(event)
  const { body } = commentBodySchema.parse(await readBody(event))
  const thread = await getApplication().services.comments.reply(itemId, threadId, body, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(thread)
})
