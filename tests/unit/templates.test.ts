import { expect, test } from 'bun:test'
import { itemTemplates } from '../../server/features/library/domain/templates'
import { itemKinds } from '../../shared/kernel/content'
import { canvasContentSchema } from '../../shared/validation/canvas'
import { validateCanvas } from '../../server/features/canvases/domain/canvasPolicy'

test('the built-in catalog covers every item kind with nonempty, valid content and independent task references', () => {
  expect(new Set(itemTemplates.map(template => template.id)).size).toBe(itemTemplates.length)
  for (const kind of itemKinds) {
    const templates = itemTemplates.filter(template => template.kind === kind)
    expect(templates.length).toBeGreaterThanOrEqual(2)
    for (const template of templates) {
      if (kind === 'document') {
        expect(template.content).toContain('## ')
      } else {
        const content = canvasContentSchema.parse(JSON.parse(template.content))
        expect(content.kind).toBe(kind)
        expect(() => validateCanvas(content, kind)).not.toThrow()
        if (content.kind === 'kanban') {
          expect(content.tasks.length).toBeGreaterThan(0)
        }
        if (content.kind === 'whiteboard') {
          expect(content.elements.length).toBeGreaterThan(0)
        }
        if (content.kind === 'diagram') {
          expect(content.edges.length).toBeGreaterThan(0)
        }
      }
    }
  }
})
