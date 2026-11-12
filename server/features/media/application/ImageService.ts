import { ApplicationError } from '../../../core/errors/ApplicationError'
import { imageExtension, requireImageFilename } from '../domain/ImagePolicy'
import type { ImageStore } from '../domain/ImageStore'

export class ImageService {
  constructor(private readonly store: ImageStore) {}

  async put(data: Uint8Array) {
    const pathname = await this.store.write(data, imageExtension(data))
    return { pathname, url: `/images/${pathname}` }
  }

  async get(filename: string) {
    requireImageFilename(filename)
    const data = await this.store.read(filename)
    if (!data) {
      throw new ApplicationError('not_found', 'Image not found')
    }
    return { data, type: `image/${filename.endsWith('.jpg') ? 'jpeg' : filename.split('.').pop()}` }
  }
}
