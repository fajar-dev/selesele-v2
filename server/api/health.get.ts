import { apiHandler, success } from '../platform/http/response'

export default apiHandler(async () => success({ status: 'ok' }))
