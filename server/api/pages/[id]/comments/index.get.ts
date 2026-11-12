import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../container'
import { apiHandler, success } from '../../../../http/response'
import { currentUser } from '../../../../http/session'
import { idSchema } from '../../../../http/schemas'

export default apiHandler(async event => success(await getContainer().comments.list(idSchema.parse(getRouterParam(event, 'id')), currentUser(event).id)))
