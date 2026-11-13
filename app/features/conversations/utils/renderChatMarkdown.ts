import { micromark } from 'micromark'

/** Render generated text without executable HTML, unsafe URLs, or remote image requests. */
export function renderChatMarkdown(content: string): string {
  return micromark(content, {
    allowDangerousHtml: false,
    allowDangerousProtocol: false,
    extensions: [{ disable: { null: ['labelStartImage'] } }]
  })
}
