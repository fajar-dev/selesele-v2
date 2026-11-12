import type { ErrorReporter } from '../../core/ports/ErrorReporter'

export class ConsoleErrorReporter implements ErrorReporter {
  report(message: string, cause: unknown): void {
    console.error(message, cause)
  }
}
