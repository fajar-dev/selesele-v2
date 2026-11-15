import { getRouterParam, getRequestIP, getRequestURL, sendRedirect, setHeader } from '@nuxt/nitro-server/h3'
import * as z from 'zod'
import { authProviders } from '../../../../shared/model/authentication'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler } from '../../../platform/http/response'
import { oauthSession } from '../../../platform/http/oauth'
import { setSession, sessionToken } from '../../../platform/http/session'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export default apiHandler(async (event) => {
  const provider = z.enum(authProviders).parse(getRouterParam(event, 'provider'))
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  const pending = await oauthSession(event, provider)
  const transaction = pending.data.transaction
  await pending.clear()
  const callback = new URL(`/api/auth/${provider}/callback`, process.env.APP_ORIGIN)
  callback.search = getRequestURL(event).search
  const { auth, oauth } = getApplication().services
  try {
    const result = await oauth.complete(provider, callback, transaction, getRequestIP(event) || null)
    await auth.logout(sessionToken(event))
    setSession(event, result.token)
    return sendRedirect(event, '/', 302)
  } catch (error) {
    if (error instanceof ApplicationError && ['invalid_input', 'unauthenticated', 'forbidden'].includes(error.code)) {
      return sendRedirect(event, `/sign-in?error=${provider}`, 302)
    }
    throw error
  }
})
