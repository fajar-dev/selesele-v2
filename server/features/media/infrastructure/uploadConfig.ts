import { resolve } from 'node:path'

export function uploadConfig(env = process.env) {
  const driver = env.UPLOAD_STORAGE || 'local'
  const directory = resolve(env.UPLOAD_DIR || '.data/uploads')
  if (driver === 'local') {
    return { driver, directory } as const
  }
  if (driver !== 'cloud') {
    throw new Error('UPLOAD_STORAGE must be local or cloud')
  }

  const bucket = env.S3_BUCKET?.trim()
  const accessKeyId = env.S3_ACCESS_KEY_ID
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY when using S3 uploads')
  }

  const endpoint = env.S3_ENDPOINT?.trim() || undefined
  if (endpoint) {
    const url = URL.parse(endpoint)
    if (!url || !['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.username || url.password || url.search || url.hash) {
      throw new Error('S3_ENDPOINT must be an HTTP(S) service origin without a bucket path or credentials')
    }
  }
  const addressStyle = env.S3_ADDRESS_STYLE || (endpoint ? 'path' : 'virtual')
  if (addressStyle !== 'path' && addressStyle !== 'virtual') {
    throw new Error('S3_ADDRESS_STYLE must be path or virtual')
  }
  const prefix = (env.S3_PREFIX ?? 'selesele/images').trim().replace(/\/+$/, '')
  if (!/^[\w-]+(?:\/[\w-]+)*$/.test(prefix)) {
    throw new Error('S3_PREFIX must be a nonempty key prefix with letters, digits, underscores, hyphens and slashes')
  }
  return {
    driver, directory, prefix,
    options: {
      bucket, accessKeyId, secretAccessKey, endpoint,
      sessionToken: env.S3_SESSION_TOKEN || undefined,
      region: env.S3_REGION || (endpoint && new URL(endpoint).hostname.endsWith('.r2.cloudflarestorage.com') ? 'auto' : 'us-east-1'),
      virtualHostedStyle: addressStyle === 'virtual'
    }
  } as const
}
