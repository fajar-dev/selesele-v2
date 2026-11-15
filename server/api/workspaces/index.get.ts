import { getApplication } from '../../bootstrap/application'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'

export default apiHandler(async (event) => {
  return success(await getApplication().services.workspaces.list(currentUser(event).id))
})
