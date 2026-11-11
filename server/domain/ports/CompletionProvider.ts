export interface CompletionProvider {
  stream(prompt: string, instructions: string): ReadableStream<string>
}
