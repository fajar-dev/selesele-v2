import { expect, test } from 'bun:test'
import { ImageService } from '../../server/features/media/application/ImageService'
import { S3ImageStore } from '../../server/features/media/infrastructure/S3ImageStore'
import { uploadConfig } from '../../server/features/media/infrastructure/uploadConfig'

const credentials = { UPLOAD_STORAGE: 'cloud', S3_BUCKET: 'images', S3_ACCESS_KEY_ID: 'test-user', S3_SECRET_ACCESS_KEY: 'fixture-secret' }

test('selects local, AWS, R2 and MinIO with provider-appropriate defaults', () => {
  expect(uploadConfig({}).driver).toBe('local')
  expect(uploadConfig(credentials)).toMatchObject({ driver: 'cloud', options: { region: 'us-east-1', virtualHostedStyle: true } })
  expect(uploadConfig({ ...credentials, S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com' })).toMatchObject({ options: { region: 'auto', virtualHostedStyle: false } })
  expect(uploadConfig({ ...credentials, S3_ENDPOINT: 'http://minio:9000' })).toMatchObject({ options: { region: 'us-east-1', virtualHostedStyle: false } })
  expect(() => uploadConfig({ UPLOAD_STORAGE: 'cloud' })).toThrow('S3_BUCKET')
  expect(() => uploadConfig({ ...credentials, S3_ENDPOINT: 'http://minio:9000/images' })).toThrow('service origin')
})

test('cloud image URLs retain authorization and restore never overwrites existing data', async () => {
  const objects = new Map<string, Uint8Array>()
  let requests = 0
  const relay = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(req) {
      requests++
      const url = new URL(req.url)
      expect(req.headers.get('authorization')).toStartWith('AWS4-HMAC-SHA256 Credential=test-user/')
      if (url.searchParams.get('list-type') === '2') {
        expect(url.searchParams.get('prefix')).toBe('selesele/images/')
        const keys = [...objects.keys()].map(path => path.slice('/images/'.length))
        const index = url.searchParams.has('continuation-token') ? 1 : 0
        const next = index < keys.length - 1
        const xml = `<ListBucketResult><IsTruncated>${next}</IsTruncated>${next ? '<NextContinuationToken>page-2</NextContinuationToken>' : ''}<Contents><Key>${keys[index]}</Key><Size>8</Size></Contents></ListBucketResult>`
        return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
      }
      if (req.method === 'PUT') {
        expect(req.headers.get('content-type')).toBe('image/png')
        objects.set(url.pathname, new Uint8Array(await req.arrayBuffer()))
        return new Response(null, { headers: { ETag: '"hash"' } })
      }
      const data = objects.get(url.pathname)
      if (!data) {
        return new Response(req.method === 'HEAD' ? null : '<Error><Code>NoSuchKey</Code><Message>Missing object</Message></Error>', { status: 404 })
      }
      return new Response(req.method === 'HEAD' ? null : new Uint8Array(data), { headers: { 'Content-Length': String(data.length), 'Content-Type': 'image/png', 'ETag': '"hash"' } })
    }
  })
  try {
    const config = uploadConfig({ ...credentials, S3_ENDPOINT: relay.url.origin })
    if (config.driver !== 'cloud') {
      throw new Error('Expected cloud fixture')
    }
    const cloud = new S3ImageStore(new Bun.S3Client(config.options), config.prefix)
    const access = new Set<string>()
    const images = new ImageService(cloud, {
      async register(filename) {
        access.add(filename)
      },
      async canUpload(_id, userId) {
        return userId === 'editor'
      },
      async canRead(filename, userId) {
        return userId === 'editor' && access.has(filename)
      }
    })
    const png = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)
    const uploaded = await images.put(png, 'editor', 'item')
    expect(uploaded.url).toBe(`/images/${uploaded.pathname}`)
    const before = requests
    await expect(images.get(uploaded.pathname, 'outsider')).rejects.toMatchObject({ code: 'not_found' })
    expect(requests).toBe(before)
    expect(await images.get(uploaded.pathname, 'editor')).toEqual({ data: png, type: 'image/png' })
    expect(await cloud.size(uploaded.pathname)).toBe(png.length)
    const second = `${crypto.randomUUID()}.png`
    expect(await cloud.read(second)).toBeNull()
    expect(await cloud.size(second)).toBeNull()
    expect(await cloud.restore(second, png)).toBe(true)
    expect(await cloud.restore(second, png)).toBe(false)
    await expect(cloud.restore(second, Uint8Array.of(1))).rejects.toThrow('different contents')
    const names: string[] = []
    for await (const name of cloud.filenames()) {
      names.push(name)
    }
    expect(names.sort()).toEqual([second, uploaded.pathname].sort())
  } finally {
    await relay.stop(true)
  }
})
