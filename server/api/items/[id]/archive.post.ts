import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { archiveItemSchema } from '../../../../shared/validation/knowledge'

export default apiHandler(async (event) => {
  const container = getContainer()
  const userId = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const input = archiveItemSchema.parse(await readBody(event))
  const result = await container.items.archive(id, input.archived, userId)
  await container.invalidateWorkspace(result.workspaceId)
  return success(result ?? null)
})
