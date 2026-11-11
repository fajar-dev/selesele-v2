import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../container'
import { apiHandler, success } from '../../../../http/response'
import { currentUser } from '../../../../http/session'
import { idSchema, memberRoleSchema } from '../../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const target = idSchema.parse(getRouterParam(event, 'userId'))
  const { role } = memberRoleSchema.parse(await readBody(event))
  await getContainer().workspaces.changeRole(id, target, role, currentUser(event).id)
  return success(null)
})
