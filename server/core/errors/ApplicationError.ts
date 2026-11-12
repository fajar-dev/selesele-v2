export type ApplicationErrorCode = 'invalid_input' | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'unavailable'

export class ApplicationError extends Error {
  constructor(readonly code: ApplicationErrorCode, message: string) {
    super(message)
    this.name = 'ApplicationError'
  }
}
