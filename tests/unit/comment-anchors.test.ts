import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorState, Plugin, TextSelection } from '@tiptap/pm/state'
import { initProseMirrorDoc, ySyncPluginKey } from '@tiptap/y-tiptap'
import { createDocument } from '../../server/infrastructure/collaboration/document'
import { captureCommentSelection } from '../../app/editor/extensions/CommentHighlights'

function fixture() {
  const document = createDocument('Important decisions need feedback.', null)
  const type = document.getXmlFragment('default')
  const { doc, mapping } = initProseMirrorDoc(type, getSchema([StarterKit]))
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, 1, 20), plugins: [new Plugin({
    key: ySyncPluginKey,
    state: { init: () => ({ doc: document, type, binding: { mapping } }), apply: (_transaction, value) => value }
  })] })
  return { document, state, text: (type.get(0) as Y.XmlElement).get(0) as Y.XmlText }
}

describe('collaborative comment anchors', () => {
  test('text inserted before or after the selected passage stays outside the annotation', () => {
    const { document, state, text } = fixture()
    try {
      const captured = captureCommentSelection({ state })!
      expect(captured.quote).toBe('Important decisions')
      text.insert(0, 'Prefix: ')
      text.insert(27, ' suffix')
      const from = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(captured.anchor.from), document)!
      const to = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(captured.anchor.to), document)!
      expect(text.toString().slice(from.index, to.index)).toBe('Important decisions')
      expect(from.index).toBe(8)
      expect(to.index).toBe(27)
    } finally {
      document.destroy()
    }
  })

  test('anchors survive transport to another peer and collapse when the original text is deleted', () => {
    const { document, state, text } = fixture()
    const peer = new Y.Doc()
    try {
      const captured = captureCommentSelection({ state })!
      Y.applyUpdate(peer, Y.encodeStateAsUpdate(document))
      const start = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(captured.anchor.from), peer)!
      expect(start.index).toBe(0)
      text.delete(0, 19)
      Y.applyUpdate(peer, Y.encodeStateAsUpdate(document))
      const from = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(captured.anchor.from), peer)!
      const to = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(captured.anchor.to), peer)!
      expect(from.index).toBe(to.index)
    } finally {
      peer.destroy()
      document.destroy()
    }
  })

  test('an empty selection cannot create a text discussion', () => {
    const { document, state } = fixture()
    try {
      const collapsed = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
      expect(captureCommentSelection({ state: collapsed })).toBeNull()
    } finally {
      document.destroy()
    }
  })
})
