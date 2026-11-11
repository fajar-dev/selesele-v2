import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler, success } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema, pageLocationSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const { folderId } = pageLocationSchema.parse(await readBody(event))
  return success(await getContainer().pages.move(id, folderId, currentUser(event).id))
})
