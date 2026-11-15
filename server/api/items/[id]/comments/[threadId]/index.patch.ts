import { readBody } from '@nuxt/nitro-server/h3'
import { commentResolutionSchema } from '../../../../../../shared/validation/comment'
import { getApplication } from '../../../../../bootstrap/application'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { commentRoute } from '../../../../../platform/http/comments'

export default apiHandler(async (event) => {
  const { itemId, threadId } = commentRoute(event)
  const { resolved } = commentResolutionSchema.parse(await readBody(event))
  return success(await getApplication().services.comments.resolve(itemId, threadId, resolved, currentUser(event).id))
})
