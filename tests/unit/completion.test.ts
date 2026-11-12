import { describe, expect, test } from 'bun:test'
import { CompletionService } from '../../server/features/writing/application/CompletionService'
import type { CompletionProvider } from '../../server/features/writing/domain/CompletionProvider'
import { completionSchema } from '../../shared/validation/completion'

class RecordingCompletionProvider implements CompletionProvider {
  prompt = ''
  instructions = ''

  stream(prompt: string, instructions: string): ReadableStream<string> {
    this.prompt = prompt
    this.instructions = instructions
    return new ReadableStream({
      start(controller) {
        controller.enqueue('Result')
        controller.close()
      }
    })
  }
}

describe('writing assistance', () => {
  test('streams provider output while keeping the user text separate from instructions', async () => {
    const provider = new RecordingCompletionProvider()
    const service = new CompletionService(provider)
    const request = completionSchema.parse({ prompt: '**Hello**', mode: 'fix' })
    const response = new Response(service.stream(request).pipeThrough(new TextEncoderStream()))

    expect(await response.text()).toBe('Result')
    expect(provider.prompt).toBe('**Hello**')
    expect(provider.instructions).toContain('Correct spelling')
    expect(provider.instructions).toContain('Preserve Markdown')
  })

  test('applies a translation target and validates request limits', () => {
    const provider = new RecordingCompletionProvider()
    const service = new CompletionService(provider)
    service.stream(completionSchema.parse({ prompt: 'Hello', mode: 'translate', language: 'Indonesian' }))

    expect(provider.instructions).toContain('Target language: Indonesian')
    expect(completionSchema.safeParse({ prompt: '', mode: 'fix' }).success).toBe(false)
    expect(completionSchema.safeParse({ prompt: 'Hello', mode: 'invalid' }).success).toBe(false)
    expect(completionSchema.safeParse({ prompt: 'x'.repeat(100001) }).success).toBe(false)
  })
})
