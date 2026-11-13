import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { canvasWriteSchema } from '../../../../shared/validation/canvas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const input = canvasWriteSchema.parse(await readBody(event))
  const container = getContainer()
  const result = await container.canvases.save(id, currentUser(event).id, input.content, input.revision)
  const item = await container.items.get(id, currentUser(event).id)
  await container.invalidateWorkspace(item.workspaceId)
  return success(result)
})
