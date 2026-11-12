import { readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { commentBodySchema } from '../../../../../../shared/validation/comment'
import { getContainer } from '../../../../../container'
import { apiHandler, success } from '../../../../../http/response'
import { currentUser } from '../../../../../http/session'
import { commentRoute } from '../../../../../http/comments'

export default apiHandler(async (event) => {
  const { pageId, threadId } = commentRoute(event)
  const { body } = commentBodySchema.parse(await readBody(event))
  const thread = await getContainer().comments.reply(pageId, threadId, body, currentUser(event).id)
  setResponseStatus(event, 201)
  return success(thread)
})
