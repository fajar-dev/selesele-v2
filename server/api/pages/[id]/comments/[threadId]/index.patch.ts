import { readBody } from '@nuxt/nitro-server/h3'
import { commentResolutionSchema } from '../../../../../../shared/validation/comment'
import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { commentRoute } from '../../../../../platform/http/comments'

export default apiHandler(async (event) => {
  const { pageId, threadId } = commentRoute(event)
  const { resolved } = commentResolutionSchema.parse(await readBody(event))
  return success(await getContainer().comments.resolve(pageId, threadId, resolved, currentUser(event).id))
})
