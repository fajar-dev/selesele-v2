import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { templateSaveSchema } from '../../../../../shared/validation/knowledge'

export default apiHandler(async (event) => {
  const container = getApplication().services
  const userId = currentUser(event).id
  const workspaceId = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const input = templateSaveSchema.parse(await readBody(event))
  const result = await container.templates.save(workspaceId, userId, input)
  return success(result ?? null)
})
