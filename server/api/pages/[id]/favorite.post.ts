import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { favoriteSchema } from '../../../../shared/validation/library'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const body = favoriteSchema.parse(await readBody(event))
  await getContainer().library.favorite(userId, id, body.favorite)
  return success(null)
})
