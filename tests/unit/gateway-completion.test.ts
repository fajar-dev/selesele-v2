import { describe, expect, test } from 'bun:test'
import { GatewayCompletionProvider } from '../../server/features/writing/infrastructure/GatewayCompletionProvider'

describe('OpenAI-compatible writing gateway', () => {
  test('requires explicit gateway credentials and model', () => {
    const config = { baseURL: 'http://localhost:1234/v1', apiKey: 'test-key', model: 'writing-model' }
    for (const field of ['baseURL', 'apiKey', 'model'] as const) {
      const provider = new GatewayCompletionProvider({ ...config, [field]: ' ' })
      expect(() => provider.stream('Hello', 'Improve this text')).toThrow('AI writing requires')
    }
  })

  test('sends authenticated chat completions and streams only generated text', async () => {
    let captured: { path: string, authorization: string | null, body: unknown } | undefined
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        captured = { path: new URL(request.url).pathname, authorization: request.headers.get('authorization'), body: await request.json() }
        const chunks = [
          { choices: [{ index: 0, delta: { role: 'assistant', content: 'Hello' }, finish_reason: null }] },
          { choices: [{ index: 0, delta: { content: ' world' }, finish_reason: null }] },
          { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }
        ].map(chunk => `data: ${JSON.stringify({ id: 'completion-test', object: 'chat.completion.chunk', created: 1, model: 'writing-model', ...chunk })}\n\n`)
        return new Response(new ReadableStream({
          start(controller) {
            for (const chunk of [...chunks, 'data: [DONE]\n\n']) {
              controller.enqueue(new TextEncoder().encode(chunk))
            }
            controller.close()
          }
        }), { headers: { 'Content-Type': 'text/event-stream' } })
      }
    })
    try {
      const provider = new GatewayCompletionProvider({ baseURL: `http://127.0.0.1:${server.port}/v1/`, apiKey: 'test-key', model: 'writing-model' })
      const response = new Response(provider.stream('Original text', 'Preserve Markdown').pipeThrough(new TextEncoderStream()))
      expect(await response.text()).toBe('Hello world')
      expect(captured?.path).toBe('/v1/chat/completions')
      expect(captured?.authorization).toBe('Bearer test-key')
      expect(captured?.body).toMatchObject({
        model: 'writing-model',
        stream: true,
        max_tokens: 4096,
        messages: [{ role: 'system', content: 'Preserve Markdown' }, { role: 'user', content: 'Original text' }]
      })
    } finally {
      await server.stop(true)
    }
  })
})
