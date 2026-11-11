import { getContainer } from '../../container'
import { apiHandler, success } from '../../http/response'
import { setSession, sessionToken } from '../../http/session'

export default apiHandler(async (event) => {
  const result = await getContainer().auth.refresh(sessionToken(event))
  setSession(event, result.token)
  return success({ user: result.user }, 'Session refreshed')
})
