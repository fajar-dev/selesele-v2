import { getRouterParam } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
import { idSchema } from '../../../shared/validation/workspace'

export function commentRoute(event: H3Event) {
  return { itemId: idSchema.parse(getRouterParam(event, 'id')), threadId: idSchema.parse(getRouterParam(event, 'threadId')) }
}
