import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const state = await getApplication().services.content.state(idSchema.parse(getRouterParam(event, 'id')), currentUser(event).id)
  return success(state ? Buffer.from(state).toString('base64') : null)
})
