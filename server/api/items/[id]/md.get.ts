import { getRouterParam, setHeader } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { ApplicationError } from '../../../core/errors/ApplicationError'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'id'))
  const item = await getContainer().items.get(id, currentUser(event).id)
  if (item.kind !== 'document') {
    throw new ApplicationError('invalid_input', 'Export this item as JSON from its editor')
  }
  const content = await getContainer().content.content(id, currentUser(event).id)
  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${id}.md"`)
  return content
})
