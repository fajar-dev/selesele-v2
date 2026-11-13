import { getContainer } from '../bootstrap/container'
import { readMultipartFormData } from '@nuxt/nitro-server/h3'
import { apiHandler } from '../platform/http/response'
import { currentUser } from '../platform/http/session'
import { idSchema } from '../../shared/validation/workspace'
import { ApplicationError } from '../core/errors/ApplicationError'

export default apiHandler(async (event) => {
  const user = currentUser(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename)
  if (!file) {
    throw new ApplicationError('invalid_input', 'Select an image to upload')
  }
  const pageId = idSchema.parse(parts?.find(part => part.name === 'pageId')?.data.toString())
  return getContainer().images.put(file.data, user.id, pageId)
})
