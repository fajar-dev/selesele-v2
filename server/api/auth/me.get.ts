import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'

export default apiHandler(async event => success(currentUser(event)))
