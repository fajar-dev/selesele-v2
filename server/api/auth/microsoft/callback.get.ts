import { getRequestIP, getRequestURL, sendRedirect, setHeader } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler } from '../../../http/response'
import { oauthSession } from '../../../http/oauth'
import { setSession, sessionToken } from '../../../http/session'
import { ApplicationError } from '../../../domain/errors/ApplicationError'

export default apiHandler(async (event) => {
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  const pending = await oauthSession(event)
  const transaction = pending.data.transaction
  await pending.clear()
  const callback = new URL('/api/auth/microsoft/callback', process.env.APP_ORIGIN)
  callback.search = getRequestURL(event).search
  const { auth, oauth } = getContainer()
  try {
    const result = await oauth.complete(callback, transaction, getRequestIP(event) || null)
    await auth.logout(sessionToken(event))
    setSession(event, result.token)
    return sendRedirect(event, '/', 302)
  } catch (error) {
    if (error instanceof ApplicationError && [400, 401, 403].includes(error.statusCode)) {
      return sendRedirect(event, '/sign-in?error=microsoft', 302)
    }
    throw error
  }
})
