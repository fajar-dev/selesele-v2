import { readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../bootstrap/container'
import { apiHandler, success } from '../platform/http/response'
import { currentUser } from '../platform/http/session'
import { questionSchema } from '../../shared/validation/library'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id
  const input = questionSchema.parse(await readBody(event))
  return success(await getContainer().questions.answer(userId, input.question, input.workspaceId))
})
