import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { pageLocationSchema } from '../../../../shared/validation/page'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const { folderId, acknowledgement } = pageLocationSchema.parse(await readBody(event))
  const container = getContainer()
  const page = await container.pages.move(id, folderId, currentUser(event).id, acknowledgement)
  await container.invalidateWorkspace(page.workspaceId)
  return success(page)
})
