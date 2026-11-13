import { ApplicationError } from '../../../core/errors/ApplicationError'
import { imageExtension, requireImageFilename } from '../domain/ImagePolicy'
import type { ImageAuthorization } from '../domain/ImageAuthorization'
import type { ImageStore } from '../domain/ImageStore'

export class ImageService {
  constructor(private readonly store: ImageStore, private readonly access: ImageAuthorization) {}

  async put(data: Uint8Array, userId: string, pageId: string) {
    if (!await this.access.canUpload(pageId, userId)) {
      throw new ApplicationError('forbidden', 'Edit access is required to upload images')
    }
    const pathname = await this.store.write(data, imageExtension(data))
    await this.access.register(pathname, userId, pageId)
    return { pathname, url: `/images/${pathname}` }
  }

  async get(filename: string, userId: string) {
    requireImageFilename(filename)
    if (!await this.access.canRead(filename, userId)) {
      throw new ApplicationError('not_found', 'Image not found')
    }
    const data = await this.store.read(filename)
    if (!data) {
      throw new ApplicationError('not_found', 'Image not found')
    }
    return { data, type: `image/${filename.endsWith('.jpg') ? 'jpeg' : filename.split('.').pop()}` }
  }
}
