import { getRouterParam, readBody } from '@nuxt/nitro-server/h3'
import * as z from 'zod'
import { getApplication } from '../../../bootstrap/application'
import { apiHandler, success } from '../../../platform/http/response'
import { currentUser } from '../../../platform/http/session'
import { idSchema } from '../../../../shared/validation/workspace'

const inputSchema = z.object({ sessionId: idSchema, cursor: z.object({ x: z.number().finite().min(-100000).max(100000), y: z.number().finite().min(-100000).max(100000) }).nullable(), selected: z.array(idSchema).max(2000), leave: z.boolean().optional() }).strict()
export default apiHandler(async (event) => {
  const app = getApplication().services, user = currentUser(event), id = idSchema.parse(getRouterParam(event, 'id')), input = inputSchema.parse(await readBody(event))
  await app.items.get(id, user.id)
  if (input.leave) {
    await app.presence.remove(id, user.id, input.sessionId)
  } else {
    const palette = ['#2563eb', '#9333ea', '#16a34a', '#dc2626', '#d97706']
    const hash = [...user.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
    await app.presence.update(id, { ...input, userId: user.id, name: user.name || 'Workspace member', color: palette[hash % palette.length]!, updatedAt: Date.now() })
  }
  return success(await app.presence.list(id))
})
