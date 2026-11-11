import { deleteCookie, getCookie, setCookie } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
import type { User } from '../../shared/types/auth'
import { ApplicationError } from '../domain/errors/ApplicationError'
import { SESSION_TTL_SECONDS } from '../application/AuthService'

export const SESSION_COOKIE = 'sele_session'

export function currentUser(event: H3Event): User {
  const user = event.context.user as User | undefined
  if (!user) {
    throw new ApplicationError(401, 'Authentication required')
  }
  return user
}

export function sessionToken(event: H3Event) {
  return getCookie(event, SESSION_COOKIE)
}

export function setSession(event: H3Event, token: string) {
  setCookie(event, SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: SESSION_TTL_SECONDS })
}

export function clearSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}
