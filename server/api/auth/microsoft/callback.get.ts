import { getRequestIP, getRequestURL, sendRedirect, setHeader } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler } from '../../../platform/http/response'
import { oauthSession } from '../../../platform/http/oauth'
import { setSession, sessionToken } from '../../../platform/http/session'
import { ApplicationError } from '../../../core/errors/ApplicationError'

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
    if (error instanceof ApplicationError && ['invalid_input', 'unauthenticated', 'forbidden'].includes(error.code)) {
      return sendRedirect(event, '/sign-in?error=microsoft', 302)
    }
    throw error
  }
})
