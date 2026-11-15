import { getApplication } from '../../bootstrap/application'
import { apiHandler, success } from '../../platform/http/response'
import { currentUser } from '../../platform/http/session'

export default apiHandler(async event => success(await getApplication().services.myTasks.assigned(currentUser(event).id)))
