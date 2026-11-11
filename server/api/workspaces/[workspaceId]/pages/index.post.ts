import { getRouterParam, readBody, setResponseStatus } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../container'
import { apiHandler, success } from '../../../../http/response'
import { currentUser } from '../../../../http/session'
import { idSchema, pageInputSchema } from '../../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const page = await getContainer().pages.create(id, pageInputSchema.parse(await readBody(event)), currentUser(event).id)
  setResponseStatus(event, 201)
  return success(page)
})
