import { apiHandler, success } from '../../http/response'
import { currentUser } from '../../http/session'

export default apiHandler(async event => success(currentUser(event)))
