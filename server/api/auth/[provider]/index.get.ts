import { getRouterParam, sendRedirect } from '@nuxt/nitro-server/h3'
import * as z from 'zod'
import { authProviders } from '../../../../shared/model/authentication'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler } from '../../../platform/http/response'
import { oauthSession } from '../../../platform/http/oauth'

export default apiHandler(async (event) => {
  const provider = z.enum(authProviders).parse(getRouterParam(event, 'provider'))
  const session = await oauthSession(event, provider)
  const { transaction, url } = await getApplication().services.oauth.begin(provider)
  await session.update({ transaction })
  return sendRedirect(event, url, 302)
})
