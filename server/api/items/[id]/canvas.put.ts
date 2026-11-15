import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { canvasWriteSchema } from '../../../../shared/validation/canvas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const input = canvasWriteSchema.parse(await readBody(event))
  const container = getApplication().services
  const result = await container.canvases.save(id, currentUser(event).id, input.content, input.revision, false, input.base)
  return success(result)
})
