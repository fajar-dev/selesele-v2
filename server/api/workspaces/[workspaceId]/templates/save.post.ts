import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { templateSaveSchema } from '../../../../../shared/validation/improvements'

export default apiHandler(async (event) => {
  const container = getContainer()
  const userId = currentUser(event).id
  const workspaceId = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const input = templateSaveSchema.parse(await readBody(event))
  const result = await container.templates.save(workspaceId, userId, input)
  await container.invalidateWorkspace(workspaceId)
  return success(result ?? null)
})
