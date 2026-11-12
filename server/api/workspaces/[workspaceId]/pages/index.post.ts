import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { pageInputSchema } from '../../../../../shared/validation/page'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const page = await getContainer().pages.create(id, pageInputSchema.parse(await readBody(event)), currentUser(event).id)
  setResponseStatus(event, 201)
  return success(page)
})
