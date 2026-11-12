export interface ErrorReporter {
  report(message: string, cause: unknown): void
}
