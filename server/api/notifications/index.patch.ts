import { getApplication } from '../../bootstrap/application'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  await getApplication().services.notifications.read(userId)
  return success(null)
})
