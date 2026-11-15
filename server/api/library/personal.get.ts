import { getApplication } from '../../bootstrap/application'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  return success(await getApplication().services.library.personal(userId))
})
