import type { DrawingElement } from '#shared/model/content'

export function drawingTextLines(element: DrawingElement) {
  if (element.type !== 'sticky') {
    return element.text.split('\n')
  }
  const font = element.fontSize || 18, limit = Math.max(1, Math.floor((element.width - 28) / (font * 0.65)))
  return element.text.split('\n').flatMap((line) => {
    const wrapped: string[] = []
    let rest = line
    while (rest.length > limit) {
      const space = rest.lastIndexOf(' ', limit), end = space > 0 ? space : limit
      wrapped.push(rest.slice(0, end))
      rest = rest.slice(end).trimStart()
    }
    return [...wrapped, rest]
  })
}
