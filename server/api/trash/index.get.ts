import { getContainer } from '../../bootstrap/container'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  return success(await getContainer().recovery.trash(userId))
})
