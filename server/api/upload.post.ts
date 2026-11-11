import { getContainer } from '../container'
import { readMultipartFormData } from '@nuxt/nitro-server/h3'
import { apiHandler } from '../http/response'
import { currentUser } from '../http/session'
import { ApplicationError } from '../domain/errors/ApplicationError'

export default apiHandler(async (event) => {
  currentUser(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename)
  if (!file) {
    throw new ApplicationError(400, 'Select an image to upload')
  }
  return getContainer().images.put(file.data)
})
