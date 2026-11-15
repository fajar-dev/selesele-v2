import { alignBoxes, clampCoordinate } from '../../canvases/domain/geometry'
import type { Alignment } from '../../canvases/domain/geometry'
import type { DiagramContent, DiagramNode, DiagramEdge } from '#shared/model/content'

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
    this.content.nodes.push({ id: crypto.randomUUID(), type: 'shape', position, data: { shape, label: shape === 'diamond' ? 'Decision' : shape === 'ellipse' ? 'Start / end' : shape === 'note' ? 'Note' : shape === 'cylinder' ? 'Database' : shape === 'parallelogram' ? 'Input / output' : shape === 'hexagon' ? 'Preparation' : 'Process', color: '#18181b', width: 180, height: 90 } })
    return this.content
  }

  connect(edge: Omit<DiagramEdge, 'id' | 'label' | 'type'>) {
    if (this.content.edges.length >= 2000) {
      throw new Error('A diagram supports up to 2,000 connectors')
    }
    if (edge.source === edge.target || !this.content.nodes.some(node => node.id === edge.source) || !this.content.nodes.some(node => node.id === edge.target)) {
      throw new Error('Choose two different existing shapes')
    }
    if (this.content.edges.some(previous => previous.source === edge.source && previous.target === edge.target && previous.sourceHandle === edge.sourceHandle && previous.targetHandle === edge.targetHandle)) {
      return this.content
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

  updateMany(ids: string[], changes: Partial<DiagramNode['data']>, includeLocked = false) {
    this.content.nodes = this.content.nodes.map(node => ids.includes(node.id) && (includeLocked || !node.data.locked) ? { ...node, data: { ...node.data, ...changes } } : node)
    return this.content
  }

  removeMany(ids: string[], edgeIds: string[] = []) {
    const removable = this.content.nodes.filter(node => ids.includes(node.id) && !node.data.locked).map(node => node.id)
    this.content.nodes = this.content.nodes.filter(node => !removable.includes(node.id))
    this.content.edges = this.content.edges.filter(edge => !removable.includes(edge.source) && !removable.includes(edge.target) && !edgeIds.includes(edge.id))
    return this.content
  }

  insert(source: DiagramContent, offset = 40) {
    if (this.content.nodes.length + source.nodes.length > 1000 || this.content.edges.length + source.edges.length > 2000) {
      throw new Error('Diagram capacity exceeded (1,000 shapes / 2,000 connectors)')
    }
    const ids = new Map(source.nodes.map(node => [node.id, crypto.randomUUID()]))
    this.content.nodes.push(...source.nodes.map(node => ({ ...JSON.parse(JSON.stringify(node)), id: ids.get(node.id)!, position: { x: clampCoordinate(node.position.x + offset), y: clampCoordinate(node.position.y + offset) }, data: { ...node.data, locked: false } })))
    this.content.edges.push(...source.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)).map(edge => ({ ...edge, id: crypto.randomUUID(), source: ids.get(edge.source)!, target: ids.get(edge.target)! })))
    return this.content
  }

  align(ids: string[], mode: Alignment) {
    const offsets = alignBoxes(this.content.nodes.filter(node => ids.includes(node.id) && !node.data.locked).map(node => ({ id: node.id, ...node.position, width: node.data.width, height: node.data.height })), mode)
    this.content.nodes = this.content.nodes.map((node) => {
      const offset = offsets.get(node.id)
      return offset ? { ...node, position: { x: clampCoordinate(node.position.x + offset.x), y: clampCoordinate(node.position.y + offset.y) } } : node
    })
    return this.content
  }

  translate(ids: string[], x: number, y: number) {
    this.content.nodes = this.content.nodes.map(node => ids.includes(node.id) && !node.data.locked ? { ...node, position: { x: clampCoordinate(node.position.x + x), y: clampCoordinate(node.position.y + y) } } : node)
    return this.content
  }

  /** Deterministic layered layout with cycles collapsed into strongly connected groups. */
  layout(direction: 'horizontal' | 'vertical' | 'grid', ids = this.content.nodes.map(node => node.id)) {
    const nodes = this.content.nodes.filter(node => ids.includes(node.id) && !node.data.locked)
    if (!nodes.length) {
      return this.content
    }
    const start = { x: Math.min(...nodes.map(node => node.position.x)), y: Math.min(...nodes.map(node => node.position.y)) }
    const selected = new Set(nodes.map(node => node.id))
    const links = this.content.edges.filter(edge => selected.has(edge.source) && selected.has(edge.target))
    // Collapse strongly connected components before layering, so loops do not flatten downstream steps.
    let sequence = 0
    const index = new Map<string, number>(), low = new Map<string, number>(), stack: string[] = [], active = new Set<string>(), components: string[][] = []
    const adjacent = new Map(nodes.map(node => [node.id, links.filter(edge => edge.source === node.id).map(edge => edge.target)]))
    const visit = (id: string) => {
      index.set(id, sequence)
      low.set(id, sequence++)
      stack.push(id)
      active.add(id)
      for (const target of adjacent.get(id)!) {
        if (!index.has(target)) {
          visit(target)
          low.set(id, Math.min(low.get(id)!, low.get(target)!))
        } else if (active.has(target)) {
          low.set(id, Math.min(low.get(id)!, index.get(target)!))
        }
      }
      if (low.get(id) === index.get(id)) {
        const group: string[] = []
        let member: string
        do {
          member = stack.pop()!
          active.delete(member)
          group.push(member)
        } while (member !== id)
        components.push(group)
      }
    }
    nodes.forEach((node) => {
      if (!index.has(node.id)) {
        visit(node.id)
      }
    })
    const membership = new Map(components.flatMap((group, i) => group.map(id => [id, i] as const)))
    const outgoing = components.map(() => new Set<number>()), degree = components.map(() => 0), levelsByGroup = components.map(() => 0)
    links.forEach((edge) => {
      const source = membership.get(edge.source)!, target = membership.get(edge.target)!
      if (source !== target && !outgoing[source]!.has(target)) {
        outgoing[source]!.add(target)
        degree[target]!++
      }
    })
    const queue = components.map((_, index) => index).filter(index => degree[index] === 0)
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const source = queue[cursor]!
      outgoing[source]!.forEach((target) => {
        levelsByGroup[target] = Math.max(levelsByGroup[target]!, levelsByGroup[source]! + 1)
        degree[target]!--
        if (degree[target] === 0) {
          queue.push(target)
        }
      })
    }
    const ranks = new Map(nodes.map(node => [node.id, levelsByGroup[membership.get(node.id)!]!]))
    if (direction === 'grid') {
      const columns = Math.ceil(Math.sqrt(nodes.length)), cellWidth = Math.max(...nodes.map(node => node.data.width)) + 80, cellHeight = Math.max(...nodes.map(node => node.data.height)) + 60
      nodes.forEach((node, index) => {
        node.position = { x: clampCoordinate(start.x + index % columns * cellWidth), y: clampCoordinate(start.y + Math.floor(index / columns) * cellHeight) }
      })
    } else {
      let main = direction === 'horizontal' ? start.x : start.y
      const levels = [...new Set(ranks.values())].sort((a, b) => a - b)
      levels.forEach((rank) => {
        const group = nodes.filter(node => ranks.get(node.id) === rank)
        let cross = direction === 'horizontal' ? start.y : start.x
        group.forEach((node) => {
          node.position = { x: clampCoordinate(direction === 'horizontal' ? main : cross), y: clampCoordinate(direction === 'horizontal' ? cross : main) }
          cross += (direction === 'horizontal' ? node.data.height : node.data.width) + 60
        })
        main += Math.max(...group.map(node => direction === 'horizontal' ? node.data.width : node.data.height)) + 100
      })
    }
    return this.content
  }

  toSvg() {
    const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&apos;')
    const nodes = this.content.nodes
    const minX = Math.min(0, ...nodes.map(node => node.position.x)) - 40, minY = Math.min(0, ...nodes.map(node => node.position.y)) - 40
    const width = Math.max(100, ...nodes.map(node => node.position.x + node.data.width)) - minX + 40, height = Math.max(100, ...nodes.map(node => node.position.y + node.data.height)) - minY + 40
    const shapes = nodes.map((node) => {
      const { width: w, height: h, shape, color, label } = node.data
      const outline = shape === 'ellipse' ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>` : shape === 'diamond' ? `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}"/>` : shape === 'parallelogram' ? `<polygon points="${w * 0.15},0 ${w},0 ${w * 0.85},${h} 0,${h}"/>` : shape === 'hexagon' ? `<polygon points="${w * 0.2},0 ${w * 0.8},0 ${w},${h / 2} ${w * 0.8},${h} ${w * 0.2},${h} 0,${h / 2}"/>` : shape === 'cylinder' ? `<path d="M 0 ${h * 0.15} A ${w / 2} ${h * 0.15} 0 0 1 ${w} ${h * 0.15} L ${w} ${h * 0.85} A ${w / 2} ${h * 0.15} 0 0 1 0 ${h * 0.85} Z"/><ellipse cx="${w / 2}" cy="${h * 0.15}" rx="${w / 2}" ry="${h * 0.15}"/>` : `<rect width="${w}" height="${h}" rx="4"/>`
      const font = node.data.fontSize || 14, lines = label.split('\n')
      const text = lines.map((line, i) => `<tspan x="${w / 2}" dy="${i ? font * 1.4 : 0}">${escape(line)}</tspan>`).join('')
      return `<g transform="translate(${node.position.x} ${node.position.y})"><g fill="${node.data.fill || (shape === 'note' ? '#fafafa' : 'white')}" stroke="${color}" ${node.data.dashed ? 'stroke-dasharray="6 4"' : ''}>${outline}</g><text x="${w / 2}" y="${h / 2 - (lines.length - 1) * font * 0.7}" fill="${node.data.fill ? 'white' : '#18181b'}" font-size="${font}" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${text}</text></g>`
    }).join('')
    const anchor = (node: DiagramNode, handle: string | null, source: boolean) => {
      const side = handle || (source ? 'right' : 'left')
      return { x: node.position.x + (side === 'left' ? 0 : side === 'right' ? node.data.width : node.data.width / 2), y: node.position.y + (side === 'top' ? 0 : side === 'bottom' ? node.data.height : node.data.height / 2) }
    }
    const connections = this.content.edges.map((edge, index) => {
      const source = nodes.find(node => node.id === edge.source), target = nodes.find(node => node.id === edge.target)
      if (!source || !target) {
        return ''
      }
      const a = anchor(source, edge.sourceHandle, true), b = anchor(target, edge.targetHandle, false), color = edge.color || '#71717a'
      const d = edge.type === 'straight' ? `M ${a.x} ${a.y} L ${b.x} ${b.y}` : edge.type === 'default' ? `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}` : edge.sourceHandle === 'bottom' || edge.sourceHandle === 'top' ? `M ${a.x} ${a.y} L ${a.x} ${(a.y + b.y) / 2} L ${b.x} ${(a.y + b.y) / 2} L ${b.x} ${b.y}` : `M ${a.x} ${a.y} L ${(a.x + b.x) / 2} ${a.y} L ${(a.x + b.x) / 2} ${b.y} L ${b.x} ${b.y}`
      return `<defs><marker id="arrow-${index}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker></defs><path d="${d}" fill="none" stroke="${color}" ${edge.dashed ? 'stroke-dasharray="6 4"' : ''} ${edge.arrow === 'both' ? `marker-start="url(#arrow-${index})"` : ''} ${edge.arrow !== 'none' ? `marker-end="url(#arrow-${index})"` : ''}/><text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 8}" font-family="sans-serif" font-size="12" fill="#18181b" text-anchor="middle">${escape(edge.label)}</text>`
    }).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">${connections}${shapes}</svg>`
  }
}
