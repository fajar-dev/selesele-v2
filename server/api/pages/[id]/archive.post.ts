import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { archivePageSchema } from '../../../../shared/validation/improvements'

export default apiHandler(async (event) => {
  const container = getContainer()
  const userId = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const input = archivePageSchema.parse(await readBody(event))
  const result = await container.pages.archive(id, input.archived, userId)
  await container.invalidateWorkspace(result.workspaceId)
  return success(result ?? null)
})
