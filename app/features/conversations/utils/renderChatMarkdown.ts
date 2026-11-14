import { micromark } from 'micromark'

/** Render generated text without executable HTML, unsafe URLs, or remote image requests. */
export function renderChatMarkdown(content: string, sourceCount = 0): string {
  const references = Array.from({ length: Math.min(sourceCount, 100) }, (_, index) => `[${index + 1}]: #workspace-source-${index + 1}`).join('\n')
  return micromark(`${content}\n\n${references}`, {
    allowDangerousHtml: false,
    allowDangerousProtocol: false,
    extensions: [{ disable: { null: ['labelStartImage'] } }]
  })
}
