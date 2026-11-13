import type { ItemTemplate } from '../../../../../shared/kernel/library'
import type { DrawingElement, WhiteboardContent } from '../../../../../shared/kernel/content'

function text(id: string, type: 'text' | 'sticky', value: string, x: number, y: number, color = '#18181b'): DrawingElement {
  const lines = type === 'sticky' ? value.split('\n').flatMap(line => line.match(/.{1,24}(?:\s|$)|\S{1,24}/g)?.map(part => part.trim()) || ['']) : value.split('\n')
  return { id, type, text: lines.join('\n'), x, y, width: type === 'text' ? 360 : 230, height: type === 'text' ? 60 : Math.max(170, lines.length * 25 + 45), points: [], color, size: 2 }
}
function drawing(id: string, title: string, description: string, elements: DrawingElement[]): ItemTemplate {
  const content: WhiteboardContent = { kind: 'whiteboard', elements: elements.map(element => ({ ...element, id: crypto.randomUUID() })) }
  return { id, title, description, kind: 'whiteboard', icon: '🎨', content: JSON.stringify(content) }
}
export const whiteboardTemplates: ItemTemplate[] = [
  drawing('brainstorm', 'Team brainstorm', 'Explore the problem, collect possibilities, and choose a next step.', [
    text('heading', 'text', 'What could we make better?', 60, 40),
    text('problem', 'sticky', 'The problem\n\nWho needs help, and what gets in their way?', 60, 150, '#2563eb'),
    text('ideas', 'sticky', 'Possibilities\n\nWrite one idea per note. Make room for unexpected ideas.', 350, 150, '#9333ea'),
    text('next', 'sticky', 'Next experiment\n\nWhat is the smallest thing we can try?', 640, 150, '#16a34a')
  ]),
  drawing('retrospective', 'Team retrospective', 'Reflect on what worked, what was difficult, and what to try next.', [
    text('heading', 'text', 'Reflect. Learn. Improve.', 60, 40),
    text('worked', 'sticky', 'What worked\n\nCelebrate progress and helpful habits.', 60, 150, '#16a34a'),
    text('difficult', 'sticky', 'What was difficult\n\nName the friction without assigning blame.', 350, 150, '#d97706'),
    text('try', 'sticky', 'What to try\n\nChoose one improvement for the next cycle.', 640, 150, '#2563eb')
  ])
]
