import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const container = getContainer()
  const userId = currentUser(event).id
  const workspaceId = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const templateId = idSchema.parse(getRouterParam(event, 'templateId'))
  const result = await container.templates.remove(workspaceId, userId, templateId)
  await container.invalidateWorkspace(workspaceId)
  return success(result ?? null)
})
