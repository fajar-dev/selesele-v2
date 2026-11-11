import { getContainer } from '../../container'
import { apiHandler, success } from '../../http/response'
import { currentUser } from '../../http/session'

export default apiHandler(async (event) => {
  return success(await getContainer().workspaces.list(currentUser(event).id))
})
