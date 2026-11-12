import { getRouterParam } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
import { idSchema } from './schemas'

export function commentRoute(event: H3Event) {
  return { pageId: idSchema.parse(getRouterParam(event, 'id')), threadId: idSchema.parse(getRouterParam(event, 'threadId')) }
}
