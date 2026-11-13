import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import { getContainer } from '../../../../../bootstrap/container'
import { apiHandler, success } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'
import { conversationQuestionSchema } from '../../../../../../shared/validation/improvements'

export default apiHandler(async (event) => {
  const container = getContainer()
  const userId = currentUser(event).id
  const workspaceId = idSchema.parse(getRouterParam(event, 'workspaceId'))
  const conversationId = idSchema.parse(getRouterParam(event, 'conversationId'))
  const input = conversationQuestionSchema.parse(await readBody(event))
  const result = await container.conversations.ask(workspaceId, userId, conversationId, input.question, input.revision)
  return success(result ?? null)
})
