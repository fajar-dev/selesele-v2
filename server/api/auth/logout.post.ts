import { getApplication } from '../../bootstrap/application'
import { apiHandler, success } from '../../platform/http/response'
import { clearSession, sessionToken } from '../../platform/http/session'

export default apiHandler(async (event) => {
  await getApplication().services.auth.logout(sessionToken(event))
  await getApplication().services.collaboration.evict(undefined, undefined, sessionToken(event))
  clearSession(event)
  return success(null, 'Logged out successfully')
})
