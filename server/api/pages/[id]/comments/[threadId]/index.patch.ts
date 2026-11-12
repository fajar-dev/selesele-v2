import { readBody } from '@nuxt/nitro-server/h3'
import { commentResolutionSchema } from '../../../../../../shared/validation/comment'
import { getContainer } from '../../../../../container'
import { apiHandler, success } from '../../../../../http/response'
import { currentUser } from '../../../../../http/session'
import { commentRoute } from '../../../../../http/comments'

export default apiHandler(async (event) => {
  const { pageId, threadId } = commentRoute(event)
  const { resolved } = commentResolutionSchema.parse(await readBody(event))
  return success(await getContainer().comments.resolve(pageId, threadId, resolved, currentUser(event).id))
})
