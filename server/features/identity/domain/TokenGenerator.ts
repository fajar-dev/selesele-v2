export interface TokenGenerator {
  generate(): string
  digest(token: string): string
}
