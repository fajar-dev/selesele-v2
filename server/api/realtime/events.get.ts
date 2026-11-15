import { getApplication } from '../../bootstrap/application'
import { apiHandler } from '../../platform/http/response'
import { currentUser, sessionToken } from '../../platform/http/session'

export default apiHandler(async (event) => {
  const application = getApplication().services, token = sessionToken(event)
  return application.realtime.stream(currentUser(event).id, () => application.auth.authenticate(token))
})
