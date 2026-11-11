import { getContainer } from '../../container'
import { apiHandler, success } from '../../http/response'
import { clearSession, sessionToken } from '../../http/session'

export default apiHandler(async (event) => {
  await getContainer().auth.logout(sessionToken(event))
  await getContainer().collaboration.evict(undefined, undefined, sessionToken(event))
  clearSession(event)
  return success(null, 'Logged out successfully')
})
