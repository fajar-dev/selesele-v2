import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { templateInputSchema } from '../../../../shared/validation/library'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  const input = templateInputSchema.parse(await readBody(event))
  return success(await getContainer().templates.create(idSchema.parse(getRouterParam(event, 'workspaceId')), input.templateId, input.folderId ?? null, userId))
})
