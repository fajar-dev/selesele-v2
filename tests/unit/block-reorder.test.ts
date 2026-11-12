import { describe, expect, test } from 'bun:test'
import { getSchema, type Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { reorderSelectedBlocks } from '../../app/features/editor/utils/blockReorder'
import { showTextToolbar } from '../../app/features/editor/utils/editorSelection'

const schema = getSchema([StarterKit, TableKit])
const paragraph = (text: string) => schema.nodes.paragraph!.create(null, schema.text(text))
const blocks = [
  schema.nodes.heading!.create({ level: 2 }, schema.text('Heading', [schema.marks.bold!.create()])),
  paragraph('Paragraph'),
  schema.nodes.bulletList!.create(null, [
    schema.nodes.listItem!.create(null, [paragraph('First item'),
      schema.nodes.bulletList!.create(null, schema.nodes.listItem!.create(null, paragraph('Nested item')))])
  ]),
  schema.nodes.table!.create(null, schema.nodes.tableRow!.create(null, [
    schema.nodes.tableCell!.create({ colspan: 2 }, paragraph('Cell'))
  ]))
]
const doc = schema.nodes.doc!.create(null, blocks)
const positions = blocks.map((_node, index) => blocks.slice(0, index).reduce((sum, node) => sum + node.nodeSize, 0))

describe('block reordering', () => {
  test('moves down in one transaction and preserves every node, mark and attribute', () => {
    const state = EditorState.create({ doc, selection: NodeSelection.create(doc, 0) })
    const transaction = reorderSelectedBlocks(state, doc.content.size)!
    expect(transaction.doc.toJSON()).toEqual(schema.nodes.doc!.create(null, [...blocks.slice(1), blocks[0]!]).toJSON())
    expect(transaction.getMeta('uiEvent')).toBe('drop')
    expect(transaction.selection.empty).toBe(true)
  })

  test('moves table and nested list upwards without flattening their structure', () => {
    for (const index of [2, 3]) {
      const state = EditorState.create({ doc, selection: NodeSelection.create(doc, positions[index]!) })
      const transaction = reorderSelectedBlocks(state, 0)!
      expect(transaction.doc.toJSON()).toEqual(schema.nodes.doc!.create(null, [blocks[index]!, ...blocks.filter((_node, i) => i !== index)]).toJSON())
    }
  })

  test('dropping on the same block or either adjacent boundary is a no-op', () => {
    const state = EditorState.create({ doc, selection: NodeSelection.create(doc, positions[1]!) })
    expect(reorderSelectedBlocks(state, positions[1]!)).toBeNull()
    expect(reorderSelectedBlocks(state, positions[2]!)).toBeNull()
  })

  test('rejects partial text selections, inline targets and out-of-document positions', () => {
    const state = EditorState.create({ doc, selection: NodeSelection.create(doc, 0) })
    for (const target of [-1, doc.content.size + 1, positions[1]! + 2]) {
      expect(reorderSelectedBlocks(state, target)).toBeNull()
    }
    const text = EditorState.create({ doc, selection: TextSelection.create(doc, 1, 4) })
    expect(reorderSelectedBlocks(text, doc.content.size)).toBeNull()
  })

  test('block selection does not open the text toolbar, while selected text still does', () => {
    const editor = { isActive: () => false } as unknown as Editor
    const view = { hasFocus: () => true } as unknown as EditorView
    const block = EditorState.create({ doc, selection: NodeSelection.create(doc, 0) })
    expect(showTextToolbar({ editor, view, state: block })).toBe(false)
    const text = EditorState.create({ doc, selection: TextSelection.create(doc, 1, 4) })
    expect(showTextToolbar({ editor, view, state: text })).toBe(true)
  })
})
