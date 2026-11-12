import { getContainer } from '../../bootstrap/container'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'

export default apiHandler(async (event) => {
  return success(await getContainer().workspaces.list(currentUser(event).id))
})
