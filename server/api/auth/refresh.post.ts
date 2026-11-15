import { getApplication } from '../../bootstrap/application'
import { apiHandler, success } from '../../platform/http/response'
import { setSession, sessionToken } from '../../platform/http/session'

export default apiHandler(async (event) => {
  const result = await getApplication().services.auth.refresh(sessionToken(event))
  setSession(event, result.token)
  return success({ user: result.user }, 'Session refreshed')
})
