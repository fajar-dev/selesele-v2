import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin, PluginKey } from '@tiptap/pm/state'

interface CompletionOptions {
  onTrigger: (editor: Editor) => void
  onAccept: () => void
  onDismiss: () => void
}
export interface CompletionStorage {
  suggestion: string
  position: number | undefined
  visible: boolean
  clearSuggestion(): void
}
declare module '@tiptap/core' {
  interface Storage { completion: CompletionStorage }
}
const completionKey = new PluginKey('completion')

export const Completion = Extension.create<CompletionOptions, CompletionStorage>({
  name: 'completion',
  addOptions: () => ({ onTrigger: () => {}, onAccept: () => {}, onDismiss: () => {} }),
  addStorage: () => ({
    suggestion: '', position: undefined, visible: false,
    clearSuggestion() {
      this.suggestion = ''
      this.position = undefined
      this.visible = false
    }
  }),
  addProseMirrorPlugins() {
    const storage = this.storage
    return [new Plugin({
      key: completionKey,
      props: {
        decorations(state) {
          if (!storage.visible || !storage.suggestion || storage.position === undefined || storage.position > state.doc.content.size) {
            return DecorationSet.empty
          }
          const widget = Decoration.widget(storage.position, () => {
            const preview = document.createElement('span')
            preview.className = 'completion-suggestion text-muted opacity-60 pointer-events-none'
            preview.textContent = storage.suggestion
            return preview
          }, { side: 1 })
          return DecorationSet.create(state.doc, [widget])
        }
      }
    })]
  },
  addKeyboardShortcuts() {
    return {
      'Mod-j': () => {
        if (!this.editor.state.selection.$from.parent.isTextblock) {
          return false
        }
        this.options.onTrigger(this.editor)
        return true
      },
      'Tab': () => {
        const { suggestion, position, visible } = this.storage
        if (!visible || !suggestion || position === undefined) {
          return false
        }
        this.storage.clearSuggestion()
        this.editor.chain().focus().command(({ tr }) => {
          tr.insertText(suggestion, position)
          return true
        }).run()
        this.options.onAccept()
        return true
      },
      'Escape': () => {
        if (!this.storage.visible) {
          return false
        }
        this.storage.clearSuggestion()
        this.editor.view.dispatch(this.editor.state.tr.setMeta(completionKey, true))
        this.options.onDismiss()
        return true
      }
    }
  },
  onTransaction({ transaction, editor }) {
    if (this.storage.visible && (transaction.docChanged || transaction.selectionSet)) {
      this.storage.clearSuggestion()
      this.options.onDismiss()
      editor.view.dispatch(editor.state.tr.setMeta(completionKey, true))
    }
  }
})
