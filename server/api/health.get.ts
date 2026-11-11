import { apiHandler, success } from '../http/response'

export default apiHandler(async () => success({ status: 'ok' }))
