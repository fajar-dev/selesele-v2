import { ApplicationError } from '../../../core/errors/ApplicationError'
import type { ImageExtension } from './ImageStore'

export function imageExtension(data: Uint8Array): ImageExtension {
  if (!data.length || data.length > 2 * 1024 * 1024) {
    throw new ApplicationError('invalid_input', 'Image must be at most 2 MB')
  }
  const matches = (signature: number[], offset = 0) => signature.every((byte, index) => data[offset + index] === byte)
  if (matches([137, 80, 78, 71, 13, 10, 26, 10])) {
    return 'png'
  }
  if (matches([255, 216, 255])) {
    return 'jpg'
  }
  if (matches([71, 73, 70, 56, 55, 97]) || matches([71, 73, 70, 56, 57, 97])) {
    return 'gif'
  }
  if (matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8)) {
    return 'webp'
  }
  throw new ApplicationError('invalid_input', 'Only PNG, JPEG, GIF and WebP images are allowed')
}

export function requireImageFilename(filename: string) {
  if (!/^[a-f0-9-]{36}\.(png|jpg|gif|webp)$/.test(filename)) {
    throw new ApplicationError('not_found', 'Image not found')
  }
}
