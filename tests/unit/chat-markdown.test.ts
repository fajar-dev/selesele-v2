import { expect, test } from 'bun:test'
import { renderChatMarkdown } from '../../app/features/conversations/utils/renderChatMarkdown'

test('chat answers render Markdown structure without executing HTML, unsafe links or loading images', () => {
  const html = renderChatMarkdown('## Next steps\n\n- **Review** the plan\n\n```js\nconst ready = true\n```')
  expect(html).toContain('<h2>Next steps</h2>')
  expect(html).toContain('<strong>Review</strong>')
  expect(html).toContain('<pre><code')
  const unsafe = renderChatMarkdown('<script>alert(1)</script>\n\n[click](javascript:alert%281%29)\n\n![tracking](https://example.invalid/pixel)\n\n<img src=x onerror=alert(1)>')
  expect(unsafe).not.toContain('<script>')
  expect(unsafe).not.toContain('href="javascript:')
  expect(unsafe).not.toContain('<img')
  expect(renderChatMarkdown('[Open](https://example.com)')).toContain('href="https://example.com"')
})

test('numbered citations become source links while code stays literal', () => {
  const html = renderChatMarkdown('The plan [1]. `Keep [1] literal`', 1)
  expect(html).toContain('href="#workspace-source-1"')
  expect(html).toContain('<code>Keep [1] literal</code>')
  expect(renderChatMarkdown('Unknown [2]', 1)).not.toContain('href="#workspace-source-2"')
})
