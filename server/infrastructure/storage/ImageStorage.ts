import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { ApplicationError } from '../../domain/errors/ApplicationError'

export class ImageStorage {
  constructor(private readonly directory = resolve(process.env.UPLOAD_DIR || '.data/uploads')) {}

  private detect(data: Buffer) {
    if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return 'png'
    }
    if (data[0] === 255 && data[1] === 216 && data[2] === 255) {
      return 'jpg'
    }
    if (['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString())) {
      return 'gif'
    }
    if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') {
      return 'webp'
    }
    throw new ApplicationError(400, 'Only PNG, JPEG, GIF and WebP images are allowed')
  }

  async put(data: Buffer) {
    if (!data.length || data.length > 2 * 1024 * 1024) {
      throw new ApplicationError(400, 'Image must be at most 2 MB')
    }
    const extension = this.detect(data)
    const filename = `${randomUUID()}.${extension}`
    await mkdir(this.directory, { recursive: true })
    await writeFile(join(this.directory, filename), data, { flag: 'wx' })
    return { pathname: filename, url: `/images/${filename}` }
  }

  async get(filename: string) {
    if (!/^[a-f0-9-]{36}\.(png|jpg|gif|webp)$/.test(filename)) {
      throw new ApplicationError(404, 'Image not found')
    }
    try {
      const data = await readFile(join(this.directory, filename))
      return { data, type: `image/${filename.endsWith('.jpg') ? 'jpeg' : filename.split('.').pop()}` }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ApplicationError(404, 'Image not found')
      }
      throw error
    }
  }
}
