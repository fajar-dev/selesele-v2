import type { WhiteboardContent } from '#shared/model/content'
import { DrawingScene } from './DrawingScene'
import { drawingTextLines } from './drawingText'
import { boundingBox } from '../../canvases/domain/geometry'

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&apos;')
/** Export the complete scene independently of viewport culling and selection overlays. */
export function whiteboardSvg(content: WhiteboardContent, itemId?: string) {
  const bounds = boundingBox(content.elements.map(DrawingScene.bounds)), width = Math.max(100, bounds.width + 128), height = Math.max(100, bounds.height + 128)
  const elements = content.elements.map((element) => {
    const w = element.width, h = element.height, font = element.fontSize || (element.type === 'sticky' ? 18 : 24), fill = element.fill || 'none'
    let body = ''
    if (element.type === 'pen') {
      body = `<path d="${DrawingScene.path(element)}" fill="${element.color}" stroke="none"/>`
    } else if (element.type === 'rectangle') {
      body = `<rect x="${Math.min(0, w)}" y="${Math.min(0, h)}" width="${Math.abs(w)}" height="${Math.abs(h)}"/>`
    } else if (element.type === 'ellipse') {
      body = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.abs(w / 2)}" ry="${Math.abs(h / 2)}"/>`
    } else if (element.type === 'image') {
      body = itemId && element.imageId ? `<image href="/api/items/${itemId}/attachments/${element.imageId}/content" width="${Math.abs(w)}" height="${Math.abs(h)}" preserveAspectRatio="xMidYMid meet"/>` : ''
    } else if (element.type === 'line' || element.type === 'arrow') {
      body = `<line x2="${w}" y2="${h}"/>`
      if (element.type === 'arrow') {
        const angle = Math.atan2(h, w), size = 14 + element.size
        body += `<polyline fill="none" points="${w - size * Math.cos(angle - Math.PI / 6)},${h - size * Math.sin(angle - Math.PI / 6)} ${w},${h} ${w - size * Math.cos(angle + Math.PI / 6)},${h - size * Math.sin(angle + Math.PI / 6)}"/>`
      }
    } else {
      const sticky = element.type === 'sticky', filled = fill !== 'none', x = sticky ? 14 : 0
      if (sticky) {
        body += `<defs><clipPath id="text-${element.id}"><rect x="10" y="8" width="${Math.max(1, w - 20)}" height="${Math.max(1, h - 16)}"/></clipPath></defs><rect width="${w}" height="${h}" fill="${filled ? fill : element.color}" fill-opacity="${filled ? 1 : 0.08}" stroke-width="1"/>`
      }
      body += `<text x="${x}" y="${sticky ? font + 12 : font}" font-size="${font}" font-family="sans-serif" fill="${sticky && filled ? '#ffffff' : element.color}" stroke="none" ${sticky ? `clip-path="url(#text-${element.id})"` : ''}>${drawingTextLines(element).map((line, index) => `<tspan x="${x}" dy="${index ? font * 1.4 : 0}">${escape(line)}</tspan>`).join('')}</text>`
    }
    return `<g transform="translate(${element.x} ${element.y})" fill="${fill}" stroke="${element.color}" stroke-width="${element.size}" opacity="${element.opacity ?? 1}" stroke-linecap="round" stroke-linejoin="round" ${element.dashed ? `stroke-dasharray="${element.size * 3} ${element.size * 2}"` : ''}>${body}</g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bounds.x - 64} ${bounds.y - 64} ${width} ${height}">${elements}</svg>`
}
