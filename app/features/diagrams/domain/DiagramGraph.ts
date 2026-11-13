import type { DiagramContent, DiagramNode, DiagramEdge } from '#shared/kernel/content'

export class DiagramGraph {
  private readonly content: DiagramContent
  constructor(content: DiagramContent) {
    this.content = JSON.parse(JSON.stringify(content))
  }

  add(shape: DiagramNode['data']['shape'], position: {
    x: number
    y: number
  }) {
    if (this.content.nodes.length >= 1000) {
      throw new Error('A diagram supports up to 1,000 shapes')
    }
    this.content.nodes.push({ id: crypto.randomUUID(), type: 'shape', position, data: { shape, label: shape === 'diamond' ? 'Decision' : shape === 'ellipse' ? 'Start / end' : shape === 'note' ? 'Note' : 'Process', color: '#18181b', width: 180, height: 90 } })
    return this.content
  }

  connect(edge: Omit<DiagramEdge, 'id' | 'label' | 'type'>) {
    if (this.content.edges.length >= 2000) {
      throw new Error('A diagram supports up to 2,000 connectors')
    }
    this.content.edges.push({ ...edge, id: crypto.randomUUID(), label: '', type: 'smoothstep' })
    return this.content
  }

  removeNode(id: string) {
    this.content.nodes = this.content.nodes.filter(node => node.id !== id)
    this.content.edges = this.content.edges.filter(edge => edge.source !== id && edge.target !== id)
    return this.content
  }

  duplicate(id: string) {
    const source = this.content.nodes.find(node => node.id === id)
    if (!source) {
      return this.content
    }
    if (this.content.nodes.length >= 1000) {
      throw new Error('A diagram supports up to 1,000 shapes')
    }
    this.content.nodes.push({ ...source, id: crypto.randomUUID(), position: { x: source.position.x + 40, y: source.position.y + 40 }, data: { ...source.data } })
    return this.content
  }

  toSvg() {
    const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&apos;')
    const nodes = this.content.nodes
    const minX = Math.min(0, ...nodes.map(node => node.position.x)) - 40
    const minY = Math.min(0, ...nodes.map(node => node.position.y)) - 40
    const width = Math.max(600, ...nodes.map(node => node.position.x + node.data.width)) - minX + 40
    const height = Math.max(400, ...nodes.map(node => node.position.y + node.data.height)) - minY + 40
    const shapes = nodes.map((node) => {
      const { width: w, height: h, shape, color, label } = node.data
      const outline = shape === 'ellipse' ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>` : shape === 'diamond' ? `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}"/>` : `<rect width="${w}" height="${h}" rx="4"/>`
      const lines = label.split('\n')
      const text = lines.map((line, i) => `<tspan x="${w / 2}" dy="${i ? 20 : 0}">${escape(line)}</tspan>`).join('')
      return `<g transform="translate(${node.position.x} ${node.position.y})"><g fill="${shape === 'note' ? '#fafafa' : 'white'}" stroke="${color}">${outline}</g><text x="${w / 2}" y="${h / 2 - (lines.length - 1) * 10}" fill="#18181b" font-size="14" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${text}</text></g>`
    }).join('')
    const connections = this.content.edges.map((edge) => {
      const source = nodes.find(node => node.id === edge.source), target = nodes.find(node => node.id === edge.target)
      if (!source || !target) {
        return ''
      }
      const x1 = source.position.x + (edge.sourceHandle === 'bottom' ? source.data.width / 2 : source.data.width)
      const y1 = source.position.y + (edge.sourceHandle === 'bottom' ? source.data.height : source.data.height / 2)
      const x2 = target.position.x + (edge.targetHandle === 'top' ? target.data.width / 2 : 0)
      const y2 = target.position.y + (edge.targetHandle === 'top' ? 0 : target.data.height / 2)
      const d = edge.type === 'straight' ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} L ${(x1 + x2) / 2} ${y1} L ${(x1 + x2) / 2} ${y2} L ${x2} ${y2}`
      return `<path d="${d}" fill="none" stroke="#71717a" marker-end="url(#arrow)"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" font-family="sans-serif" font-size="12" text-anchor="middle">${escape(edge.label)}</text>`
    }).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a"/></marker></defs>${connections}${shapes}</svg>`
  }
}
