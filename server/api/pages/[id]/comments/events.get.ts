import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler } from '../../../../platform/http/response'
import { currentUser, sessionToken } from '../../../../platform/http/session'
import { invalidationStream } from '../../../../platform/http/invalidationStream'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const app = getContainer(), userId = currentUser(event).id, token = sessionToken(event)
  const id = idSchema.parse(getRouterParam(event, 'id'))
  await app.pages.get(id, userId)
  return invalidationStream(app.commentEvents, id, async () => {
    await app.auth.authenticate(token)
    await app.pages.get(id, userId)
  })
})
