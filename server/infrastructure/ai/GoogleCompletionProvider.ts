import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import type { CompletionProvider } from '../../domain/ports/CompletionProvider'
import { ApplicationError } from '../../domain/errors/ApplicationError'

interface GoogleCompletionConfig {
  apiKey: string
  model: string
}

export class GoogleCompletionProvider implements CompletionProvider {
  constructor(private readonly config: GoogleCompletionConfig) {}

  stream(prompt: string, system: string): ReadableStream<string> {
    if (!this.config.apiKey) {
      throw new ApplicationError(503, 'AI completion is not configured')
    }

    const google = createGoogleGenerativeAI({ apiKey: this.config.apiKey })
    return streamText({
      model: google(this.config.model),
      system,
      prompt,
      maxOutputTokens: 4096
    }).textStream
  }
}
