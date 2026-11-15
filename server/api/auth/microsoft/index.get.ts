import { sendRedirect } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler } from '../../../platform/http/response'
import { oauthSession } from '../../../platform/http/oauth'

export default apiHandler(async (event) => {
  const session = await oauthSession(event)
  const { transaction, url } = await getApplication().services.oauth.begin()
  await session.update({ transaction })
  return sendRedirect(event, url, 302)
})
