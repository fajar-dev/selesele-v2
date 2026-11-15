import { getApplication } from '../../../../../bootstrap/application'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { commentRoute } from '../../../../../platform/http/comments'

export default apiHandler(async (event) => {
  const { itemId, threadId } = commentRoute(event)
  await getApplication().services.comments.delete(itemId, threadId, currentUser(event).id)
  return success(null)
})
