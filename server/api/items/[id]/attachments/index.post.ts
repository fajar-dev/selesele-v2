import { getRouterParam } from '@nuxt/nitro-server/h3'
import { getApplication } from '../../../../bootstrap/application'
import { apiHandler, success } from '../../../../platform/http/response'
import { currentUser } from '../../../../platform/http/session'
import { readLimitedForm } from '../../../../platform/http/readLimitedForm'
import { idSchema } from '../../../../../shared/validation/workspace'
import { objectReferenceSchema } from '../../../../../shared/validation/itemResources'
import { ApplicationError } from '../../../../core/errors/ApplicationError'

export default apiHandler(async (event) => {
  const userId = currentUser(event).id, id = idSchema.parse(getRouterParam(event, 'id')), app = getApplication().services
  await app.items.writable(id, userId)
  const form = await readLimitedForm(event, 11 * 1024 * 1024), file = form.get('file')
  if (!(file instanceof File)) {
    throw new ApplicationError('invalid_input', 'Choose a file')
  }
  let anchor = null
  if (form.get('anchor')) {
    try {
      anchor = objectReferenceSchema.parse(JSON.parse(String(form.get('anchor'))))
    } catch {
      throw new ApplicationError('invalid_input', 'Choose a valid object for this attachment')
    }
  }
  return success(await app.itemResources.attach(id, userId, file.name, new Uint8Array(await file.arrayBuffer()), anchor))
})
