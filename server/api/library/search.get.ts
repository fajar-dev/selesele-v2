import { getQuery } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../bootstrap/application'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'
import { searchSchema } from '../../../shared/validation/library'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  const query = searchSchema.parse(getQuery(event))
  return success(await getApplication().services.library.search(userId, query.q, query.workspaceId, { kind: query.kind, createdBy: query.createdBy, folderId: query.folderId, updatedAfter: query.updatedAfter, updatedBefore: query.updatedBefore, label: query.label }))
})
