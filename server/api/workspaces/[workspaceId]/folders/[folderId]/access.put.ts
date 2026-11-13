import { getRouterParam, readBody, createError } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'
import { resourcePolicySchema } from '../../../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getContainer()
  const actor = currentUser(event).id
  const id = idSchema.parse(getRouterParam(event, 'folderId'))
  const policy = await app.resources.policy('folder', id, actor)
  if (policy.workspaceId !== idSchema.parse(getRouterParam(event, 'workspaceId'))) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }
  await app.resources.save('folder', id, actor, resourcePolicySchema.parse(await readBody(event)))
  await app.invalidateWorkspace(policy.workspaceId)
  return success(null)
})
