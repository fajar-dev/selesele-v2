import type { CompletionRequest, CompletionMode } from '../../shared/validation/completion'
import type { CompletionProvider } from '../domain/ports/CompletionProvider'

const instructions: Record<CompletionMode, string> = {
  continue: 'Continue naturally from the cursor without repeating the input. Match the topic, tone and sentence structure. Include leading whitespace when needed.',
  fix: 'Correct spelling, grammar and punctuation while maintaining the original voice and meaning.',
  extend: 'Expand the text with useful details and examples while maintaining its original tone.',
  reduce: 'Make the text concise while preserving its meaning and essential information.',
  simplify: 'Rewrite with simple vocabulary and short sentences for a general audience.',
  summarize: 'Summarize the essential ideas. Use a short paragraph or bullets as appropriate.',
  translate: 'Translate accurately while maintaining the original tone and intent.'
}

export class CompletionService {
  constructor(private readonly provider: CompletionProvider) {}

  stream(request: CompletionRequest): ReadableStream<string> {
    const system = [
      'You are a writing assistant embedded in a document editor.',
      instructions[request.mode],
      request.mode === 'translate' ? `Target language: ${request.language || 'English'}.` : '',
      'Preserve Markdown formatting. Return only the resulting text without explanations or surrounding quotes.'
    ].filter(Boolean).join('\n')

    return this.provider.stream(request.prompt, system)
  }
}
