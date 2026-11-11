import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../container'
import { apiHandler, success } from '../../../http/response'
import { currentUser } from '../../../http/session'
import { idSchema } from '../../../http/schemas'

export default apiHandler(async (event) => {
  const id = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const { workspaces, folders, pages } = getContainer()
  const userId = currentUser(event).id
  const workspace = await workspaces.requireMember(id, userId)
  const [folderList, pageList, members] = await Promise.all([folders.list(id, userId), pages.list(id, userId), workspaces.members(id, userId)])
  return success({ workspace, folders: folderList, pages: pageList, members })
})
