import { readdir } from 'node:fs/promises'
import { LocalImageStore } from '../server/features/media/infrastructure/LocalImageStore'
import { S3ImageStore } from '../server/features/media/infrastructure/S3ImageStore'
import { uploadConfig } from '../server/features/media/infrastructure/uploadConfig'
import { requireImageFilename } from '../server/features/media/domain/ImagePolicy'

if (!process.argv.includes('--confirm') || process.env.APP_STOPPED_FOR_UPLOAD_COPY !== '1') {
  throw new Error('Stop application writes, then run APP_STOPPED_FOR_UPLOAD_COPY=1 bun run uploads:copy-to-cloud --confirm')
}
const config = uploadConfig({ ...process.env, UPLOAD_STORAGE: 'cloud' })
if (config.driver !== 'cloud') {
  throw new Error('Cloud upload configuration is required')
}

const local = new LocalImageStore(config.directory)
const cloud = new S3ImageStore(new Bun.S3Client(config.options), config.prefix)
const entries = await readdir(config.directory, { withFileTypes: true })
for (const entry of entries) {
  if (!entry.isFile()) {
    throw new Error('Upload directory contains a non-regular file')
  }
  requireImageFilename(entry.name)
}
let copied = 0
for (const { name } of entries) {
  const data = await local.read(name)
  if (!data) {
    throw new Error('A local upload disappeared during the copy')
  }
  if (await cloud.restore(name, data)) {
    copied++
  }
}
console.log(`Verified ${entries.length} images: ${copied} uploaded; ${entries.length - copied} already present. Local files were kept.`)
