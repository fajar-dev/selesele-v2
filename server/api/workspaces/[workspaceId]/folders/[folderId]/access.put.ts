import { getRouterParam, readBody, createError } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../../bootstrap/application'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'
import { resourcePolicySchema } from '../../../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getApplication().services
  const actor = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'folderId'))
  const policy = await app.access.policy('folder', id, actor)
  if (policy.workspaceId !== idSchema.parse(getRouterParam(event, 'workspaceId'))) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }
  await app.access.save('folder', id, actor, resourcePolicySchema.parse(await readBody(event)))
  return success(null)
})
