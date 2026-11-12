import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { commentRoute } from '../../../../../platform/http/comments'

export default apiHandler(async (event) => {
  const { pageId, threadId } = commentRoute(event)
  await getContainer().comments.delete(pageId, threadId, currentUser(event).id)
  return success(null)
})
