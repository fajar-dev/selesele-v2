import { sendRedirect } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler } from '../../../http/response'
import { oauthSession } from '../../../http/oauth'

export default apiHandler(async (event) => {
  const session = await oauthSession(event)
  const { transaction, url } = await getContainer().oauth.begin()
  await session.update({ transaction })
  return sendRedirect(event, url, 302)
})
