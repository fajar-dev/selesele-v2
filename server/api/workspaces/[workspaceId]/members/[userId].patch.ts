import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema, memberRoleSchema } from '../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const target = idSchema.parse(getRouterParam(event, 'userId'))
  const { role } = memberRoleSchema.parse(await readBody(event))
  await getContainer().memberships.changeRole(id, target, role, currentUser(event).id)
  return success(null)
})
