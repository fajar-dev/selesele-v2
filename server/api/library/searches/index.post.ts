import { readBody } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { savedSearchSchema } from '../../../../shared/validation/itemResources'

export default apiHandler(async (event) => {
  await getApplication().services.itemResources.saveSearch(currentUser(event).id, savedSearchSchema.parse(await readBody(event)))
  return success(null)
})
