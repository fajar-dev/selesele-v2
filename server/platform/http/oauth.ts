import { useSession } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
import type { OAuthTransaction } from '../../features/identity/domain/OAuthTransaction'
import { ApplicationError } from '../../core/errors/ApplicationError'
import { OAUTH_TTL_SECONDS } from '../../features/identity/domain/OAuthPolicy'

export function oauthSession(event: H3Event) {
  const password = process.env.AUTH_SECRET || ''
  if (password.length < 32) {
    throw new ApplicationError('unavailable', 'AUTH_SECRET must contain at least 32 characters')
  }
  return useSession<{ transaction?: OAuthTransaction }>(event, {
    name: 'sele_oauth',
    password,
    maxAge: OAUTH_TTL_SECONDS,
    sessionHeader: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/microsoft' }
  })
}
