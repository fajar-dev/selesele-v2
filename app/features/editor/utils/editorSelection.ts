import type { Editor } from '@tiptap/core'
import { TextSelection, type EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { CellSelection } from '@tiptap/pm/tables'

interface ToolbarContext {
  editor: Editor
  state: EditorState
  view: EditorView
}

export function showTextToolbar({ editor, state, view }: ToolbarContext): boolean {
  return view.hasFocus()
    && state.selection instanceof TextSelection
    && !state.selection.empty
    && !editor.isActive('image')
    && !editor.isActive('imageUpload')
}

export function showImageToolbar({ editor, view }: ToolbarContext): boolean {
  return editor.isActive('image') && view.hasFocus()
}

export function showTableToolbar({ state, view }: ToolbarContext): boolean {
  return state.selection instanceof CellSelection && view.hasFocus()
}
