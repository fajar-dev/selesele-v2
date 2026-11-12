import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ImageExtension, ImageStore } from '../domain/ImageStore'

export class LocalImageStore implements ImageStore {
  constructor(private readonly directory: string) {}

  async write(data: Uint8Array, extension: ImageExtension) {
    const filename = `${randomUUID()}.${extension}`
    await mkdir(this.directory, { recursive: true })
    await writeFile(join(this.directory, filename), data, { flag: 'wx' })
    return filename
  }

  async read(filename: string) {
    try {
      return await readFile(join(this.directory, filename))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }
}
