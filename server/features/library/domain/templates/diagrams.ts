import type { ItemTemplate } from '../../../../../shared/kernel/library'
import type { DiagramContent, DiagramNode } from '../../../../../shared/kernel/content'

function node(id: string, label: string, x: number, y: number, shape: DiagramNode['data']['shape'] = 'rectangle'): DiagramNode {
  return { id, type: 'shape', position: { x, y }, data: { label, shape, color: '#18181b', width: 180, height: 90 } }
}
function diagram(id: string, title: string, description: string, nodes: DiagramNode[], connections: [string, string, string][]): ItemTemplate {
  const ids = new Map(nodes.map(node => [node.id, crypto.randomUUID()]))
  const content: DiagramContent = {
    kind: 'diagram', nodes: nodes.map(node => ({ ...node, id: ids.get(node.id)! })),
    edges: connections.map(([source, target, label]) => ({ id: crypto.randomUUID(), source: ids.get(source)!, target: ids.get(target)!, label, sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep' }))
  }
  return { id, title, description, kind: 'diagram', icon: '🔀', content: JSON.stringify(content) }
}
export const diagramTemplates: ItemTemplate[] = [
  diagram('approval-flow', 'Review workflow', 'Map a review process, including the path for revisions.', [
    node('start', 'Request received', 0, 100, 'ellipse'), node('review', 'Review request', 260, 100),
    node('decision', 'Approved?', 520, 100, 'diamond'), node('done', 'Complete', 800, 20, 'ellipse'),
    node('revise', 'Request revisions', 800, 220)
  ], [['start', 'review', ''], ['review', 'decision', ''], ['decision', 'done', 'Yes'], ['decision', 'revise', 'No'], ['revise', 'review', 'Review again']]),
  diagram('system-map', 'System architecture', 'Describe how clients, services, and storage work together.', [
    node('client', 'Web application', 0, 100), node('api', 'Application service', 280, 100),
    node('storage', 'Persistent storage', 580, 20), node('worker', 'Background worker', 580, 220)
  ], [['client', 'api', 'HTTPS'], ['api', 'storage', 'Read / write'], ['api', 'worker', 'Enqueue work'], ['worker', 'storage', 'Persist results']])
]
