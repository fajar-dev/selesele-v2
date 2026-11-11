export class ApplicationError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message)
    this.name = 'ApplicationError'
  }
}
