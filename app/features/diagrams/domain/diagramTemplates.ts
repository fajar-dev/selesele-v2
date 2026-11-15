import type { DiagramContent, DiagramNode } from '#shared/model/content'

export function diagramTemplate(kind: 'flowchart' | 'orgchart', x = 0, y = 0): DiagramContent {
  const make = (label: string, shape: DiagramNode['data']['shape'], dx: number, dy: number): DiagramNode => ({ id: crypto.randomUUID(), type: 'shape', position: { x: x + dx, y: y + dy }, data: { label, shape, color: '#18181b', width: 180, height: 90 } })
  const nodes = kind === 'flowchart' ? [make('Start', 'ellipse', 200, 0), make('Ready?', 'diamond', 200, 180), make('Do the work', 'rectangle', 60, 360), make('Review inputs', 'parallelogram', 400, 180), make('Done', 'ellipse', 60, 540)] : [make('Team lead', 'rectangle', 240, 0), make('Design', 'rectangle', 0, 200), make('Engineering', 'rectangle', 240, 200), make('Operations', 'rectangle', 480, 200)]
  const pairs = kind === 'flowchart' ? [[0, 1, ''], [1, 2, 'Yes'], [1, 3, 'No'], [3, 1, 'Retry'], [2, 4, '']] as const : [[0, 1, ''], [0, 2, ''], [0, 3, '']] as const
  return { kind: 'diagram', nodes, edges: pairs.map(([source, target, label]) => ({ id: crypto.randomUUID(), source: nodes[source]!.id, target: nodes[target]!.id, sourceHandle: source === 1 && target === 3 ? 'right' : 'bottom', targetHandle: source === 3 ? 'right' : 'top', label, type: 'smoothstep' })) }
}
