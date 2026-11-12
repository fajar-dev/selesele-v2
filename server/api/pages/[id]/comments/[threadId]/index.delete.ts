import { getContainer } from '../../../../../container'
import { apiHandler, success } from '../../../../../http/response'
import { currentUser } from '../../../../../http/session'
import { commentRoute } from '../../../../../http/comments'

export default apiHandler(async (event) => {
  const { pageId, threadId } = commentRoute(event)
  await getContainer().comments.delete(pageId, threadId, currentUser(event).id)
  return success(null)
})
