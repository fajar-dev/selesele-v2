import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../bootstrap/container'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'
import { transferInputSchema } from '../../../../shared/validation/workspaceSettings'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const userId = currentUser(event).id
  await getContainer().settings.transfer(id, userId, transferInputSchema.parse(await readBody(event)).userId)
  await getContainer().invalidateWorkspace(id)
  return success(null)
})
