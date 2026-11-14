import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText } from 'ai'
import type { CompletionProvider } from '../domain/CompletionProvider'
import { ApplicationError } from '../../../core/errors/ApplicationError'

interface GatewayCompletionConfig {
  baseURL: string
  apiKey: string
  model: string
}

export class GatewayCompletionProvider implements CompletionProvider {
  constructor(private readonly config: GatewayCompletionConfig) {}

  stream(prompt: string, system: string, signal?: AbortSignal): ReadableStream<string> {
    const baseURL = this.config.baseURL.trim()
    const apiKey = this.config.apiKey.trim()
    const model = this.config.model.trim()
    if (!baseURL || !apiKey || !model) {
      throw new ApplicationError('unavailable', 'AI writing requires AI_BASE_URL, AI_API_KEY and AI_MODEL')
    }

    const gateway = createOpenAICompatible({ name: 'gateway', baseURL, apiKey })
    return streamText({
      model: gateway.chatModel(model),
      system,
      prompt,
      maxOutputTokens: 4096,
      abortSignal: signal,
      onError: () => {
        console.error('AI gateway request failed')
      }
    }).fullStream.pipeThrough(new TransformStream({
      transform(part, controller) {
        if (part.type === 'text-delta') {
          controller.enqueue(part.text)
        }
        if (part.type === 'error') {
          throw new ApplicationError('unavailable', 'The AI gateway could not complete the request. Please try again later.')
        }
      }
    }))
  }
}
