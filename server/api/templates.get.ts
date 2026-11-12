import { getContainer } from '../bootstrap/container'
import { apiHandler, success } from '../platform/http/response'

export default apiHandler(async () => success(getContainer().templates.list()))
