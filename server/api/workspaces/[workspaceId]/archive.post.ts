import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { archiveInputSchema } from '../../../../shared/validation/workspaceSettings'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const userId = currentUser(event).id
  await getApplication().services.settings.archive(id, userId, archiveInputSchema.parse(await readBody(event)).archived)
  return success(null)
})
