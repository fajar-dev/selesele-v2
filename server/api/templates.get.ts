import { getApplication } from '../bootstrap/application'
import { apiHandler, success } from '../platform/http/response'

export default apiHandler(async () => success(getApplication().services.templates.list()))
