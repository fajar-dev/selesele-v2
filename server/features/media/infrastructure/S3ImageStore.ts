import type { ImageExtension, ImageStore } from '../domain/ImageStore'
import { imageContentType, requireImageFilename } from '../domain/ImagePolicy'

function objectMissing(error: unknown) {
  return !!error && typeof error === 'object' && 'code' in error && ['NoSuchKey', 'NotFound'].includes(String(error.code))
}

export class S3ImageStore implements ImageStore {
  constructor(private readonly client: Bun.S3Client, private readonly prefix: string) {}

  private file(filename: string) {
    requireImageFilename(filename)
    return this.client.file(`${this.prefix}/${filename}`)
  }

  async write(data: Uint8Array, extension: ImageExtension) {
    const filename = `${crypto.randomUUID()}.${extension}`
    await this.put(filename, data)
    return filename
  }

  private async put(filename: string, data: Uint8Array) {
    await this.file(filename).write(data, { type: imageContentType(filename) })
  }

  async read(filename: string): Promise<Uint8Array | null> {
    try {
      return await this.file(filename).bytes()
    } catch (error) {
      if (objectMissing(error)) {
        return null
      }
      throw error
    }
  }

  async size(filename: string): Promise<number | null> {
    try {
      return (await this.file(filename).stat()).size
    } catch (error) {
      if (objectMissing(error)) {
        return null
      }
      throw error
    }
  }

  async* filenames() {
    const prefix = `${this.prefix}/`
    let continuationToken: string | undefined
    do {
      const page = await this.client.list({ prefix, continuationToken })
      for (const { key } of page.contents ?? []) {
        const filename = key.slice(prefix.length)
        requireImageFilename(filename)
        yield filename
      }
      const next = page.nextContinuationToken
      if (page.isTruncated && (!next || next === continuationToken)) {
        throw new Error('Object storage returned an incomplete listing')
      }
      continuationToken = page.isTruncated ? next : undefined
    } while (continuationToken)
  }

  /** Used during maintenance with writes stopped; refuse to replace conflicting data. */
  async restore(filename: string, data: Uint8Array) {
    const existing = await this.read(filename)
    if (existing) {
      if (!Buffer.from(existing).equals(data)) {
        throw new Error(`Object storage already contains different contents for ${filename}`)
      }
      return false
    }
    await this.put(filename, data)
    return true
  }
}
