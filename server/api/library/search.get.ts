import { getQuery } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../bootstrap/container'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'
import { searchSchema } from '../../../shared/validation/library'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  const query = searchSchema.parse(getQuery(event))
  return success(await getContainer().library.search(userId, query.q, query.workspaceId))
})
