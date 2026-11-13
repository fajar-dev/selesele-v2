import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  await getContainer().recovery.restoreVersion(userId, idSchema.parse(getRouterParam(event, 'id')), idSchema.parse(getRouterParam(event, 'versionId')))
  const item = await getContainer().items.get(idSchema.parse(getRouterParam(event, 'id')), userId)
  await getContainer().invalidateWorkspace(item.workspaceId)
  return success(null)
})
