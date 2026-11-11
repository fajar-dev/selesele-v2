import { createError, defineEventHandler } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
import { ZodError } from 'zod'
import { ApplicationError } from '../domain/errors/ApplicationError'

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
        throw createError({ statusCode: error.statusCode, message: error.message })
      }
      throw error
    }
  })
}
