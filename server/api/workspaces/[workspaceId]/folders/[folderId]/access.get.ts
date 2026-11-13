import { getRouterParam, createError } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const app = getContainer()
  const actor = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'folderId'))
  const policy = await app.resources.policy('folder', id, actor)
  if (policy.workspaceId !== idSchema.parse(getRouterParam(event, 'workspaceId'))) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }
  return success(policy)
})
