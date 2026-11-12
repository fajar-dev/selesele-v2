import { getContainer } from '../bootstrap/container'
import { readMultipartFormData } from '@nuxt/nitro-server/h3'
import { apiHandler } from '../platform/http/response'
import { currentUser } from '../platform/http/session'
import { ApplicationError } from '../core/errors/ApplicationError'

export default apiHandler(async (event) => {
  currentUser(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename)
  if (!file) {
    throw new ApplicationError('invalid_input', 'Select an image to upload')
  }
  return getContainer().images.put(file.data)
})
