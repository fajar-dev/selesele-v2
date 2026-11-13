import { getContainer } from '../../bootstrap/container'
import { apiHandler } from '../../platform/http/response'
import { currentUser, sessionToken } from '../../platform/http/session'
import { invalidationStream } from '../../platform/http/invalidationStream'

export default apiHandler(async (event) => {
  const app = getContainer(), token = sessionToken(event)
  return invalidationStream(app.notificationEvents, currentUser(event).id, () => app.auth.authenticate(token))
})
