import { getRouterParam, getQuery } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../../bootstrap/application'
import { apiHandler } from '../../../../../platform/http/response'
import { currentUser } from '../../../../../platform/http/session'
import { idSchema } from '../../../../../../shared/validation/workspace'

export default apiHandler(async (event) => {
  const file = await getApplication().services.itemResources.content(idSchema.parse(getRouterParam(event, 'id')), idSchema.parse(getRouterParam(event, 'attachmentId')), currentUser(event).id)
  const inline = getQuery(event).download !== '1' && (file.mime.startsWith('image/') || ['application/pdf', 'text/plain'].includes(file.mime))
  return new Response(new Uint8Array(file.data), { headers: { 'Content-Type': file.mime, 'Content-Length': String(file.size), 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name).replaceAll('\'', '%27')}`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox; default-src \'none\'; img-src \'self\' data:', 'Cache-Control': 'private, no-store' } })
})
