import { readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { commentBodySchema } from '../../../../../../shared/validation/comment'
import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { commentRoute } from '../../../../../platform/http/comments'

export default apiHandler(async (event) => {
  const { pageId, threadId } = commentRoute(event)
  const { body } = commentBodySchema.parse(await readBody(event))
  const thread = await getContainer().comments.reply(pageId, threadId, body, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(thread)
})
