import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler, success } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema, contentSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const { content } = contentSchema.parse(await readBody(event))
  const result = await getContainer().pages.updateContent(id, content, currentUser(event).id)
  await getContainer().collaboration.replaceMarkdown(id, content)
  return success(result ?? null)
})
