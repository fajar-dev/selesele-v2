import { getRouterParam, setHeader } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const userId = currentUser(event).id
  const data = await getApplication().services.settings.export(id, userId)
  setHeader(event, 'Content-Type', 'application/gzip')
  setHeader(event, 'Content-Disposition', `attachment; filename="workspace-${id}.tar.gz"`)
  setHeader(event, 'Cache-Control', 'no-store')
  return data
})
