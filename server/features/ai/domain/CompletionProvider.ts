export interface CompletionProvider {
  stream(prompt: string, instructions: string, signal?: AbortSignal): ReadableStream<string>
}
