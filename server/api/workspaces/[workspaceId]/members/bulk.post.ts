import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../bootstrap/container'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { idSchema } from '../../../../../shared/validation/workspace'
import { bulkMembersSchema } from '../../../../../shared/validation/member'

export default apiHandler(async (event) => {
  const app = getContainer()
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const actor = currentUser(event).id
  const before = await app.members.roster(id, actor)
  const result = await app.members.bulk(id, actor, bulkMembersSchema.parse(await readBody(event)))
  await app.invalidateWorkspace(id)
  for (const member of before) {
    if (member.userId) {
      app.notificationEvents.changed(member.userId)
    }
  }
  return success(result)
})
