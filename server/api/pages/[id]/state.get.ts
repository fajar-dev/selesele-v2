import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const state = await getContainer().documents.state(idSchema.parse(getRouterParam(event, 'id')), currentUser(event).id)
  return success(state ? Buffer.from(state).toString('base64') : null)
})
