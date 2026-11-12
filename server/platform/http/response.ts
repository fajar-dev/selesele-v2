import { createError, defineEventHandler } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
import { ZodError } from 'zod'
import type { ApplicationErrorCode } from '../../core/errors/ApplicationError'
import { ApplicationError } from '../../core/errors/ApplicationError'

const statusCodes: Record<ApplicationErrorCode, number> = { invalid_input: 400, unauthenticated: 401, forbidden: 403, not_found: 404, conflict: 409, unavailable: 503 }

export function success<T>(data: T, message = 'Success') {
  return { success: true as const, message, data }
}

export function apiHandler<T>(handler: (event: H3Event) => Promise<T>) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      if (error instanceof ZodError) {
        throw createError({ statusCode: 400, message: 'Validation failed', data: error.flatten() })
      }
      if (error instanceof ApplicationError) {
        throw createError({ statusCode: statusCodes[error.code], message: error.message })
      }
      throw error
    }
  })
}
