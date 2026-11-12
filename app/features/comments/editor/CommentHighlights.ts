import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { captureTextRange, resolveTextRange } from '../../editor/utils/textAnchors'
import type { CommentAnchor } from '#shared/contracts/comment'

interface TextAnnotation { id: string, anchor: CommentAnchor }
interface HighlightOptions {
  annotations: () => TextAnnotation[]
  activeId: () => string | null
  onSelect: (id: string) => void
  onCreate: () => void
}
export const commentHighlightKey = new PluginKey<DecorationSet>('commentHighlights')

export function commentRange(state: EditorState, anchor: CommentAnchor) {
  const range = resolveTextRange(state, anchor)
  return range && range.from < range.to ? range : null
}

export function captureCommentSelection(editor: Pick<Editor, 'state'>) {
  const { state } = editor
  const { from, to, empty } = state.selection
  const quote = state.doc.textBetween(from, to, '\n')
  const anchor = !empty && quote.trim() ? captureTextRange(state, from, to) : null
  return anchor ? { quote, anchor } : null
}

export const CommentHighlights = Extension.create<HighlightOptions>({
  name: 'commentHighlights',
  addOptions: () => ({ annotations: () => [], activeId: () => null, onSelect: () => {}, onCreate: () => {} }),
  addKeyboardShortcuts() {
    return { 'Mod-Alt-m': () => {
      if (this.editor.state.selection.empty) {
        return false
      }
      this.options.onCreate()
      return true
    } }
  },
  addProseMirrorPlugins() {
    const options = this.options
    return [new Plugin<DecorationSet>({
      key: commentHighlightKey,
      state: {
        init: () => DecorationSet.empty,
        apply: (transaction, decorations) => transaction.getMeta(commentHighlightKey) instanceof DecorationSet
          ? transaction.getMeta(commentHighlightKey)
          : decorations.map(transaction.mapping, transaction.doc)
      },
      props: {
        decorations: state => commentHighlightKey.getState(state),
        handleClick: (_view, _pos, event) => {
          const target = event.target instanceof Element ? event.target.closest('[data-comment-thread]') : null
          const id = target?.getAttribute('data-comment-thread')
          if (id && id !== 'draft') {
            options.onSelect(id)
            return true
          }
          return false
        },
        handleDOMEvents: {
          keydown: (_view, event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
              return false
            }
            const id = event.target instanceof Element ? event.target.closest('[data-comment-thread]')?.getAttribute('data-comment-thread') : null
            if (!id || id === 'draft') {
              return false
            }
            event.preventDefault()
            options.onSelect(id)
            return true
          }
        }
      },
      view(view) {
        let queued = false
        let destroyed = false
        let signature = ''
        const refresh = () => {
          if (queued || destroyed) {
            return
          }
          queued = true
          // Yjs updates its position mapping after applying the editor transaction.
          queueMicrotask(() => {
            queued = false
            if (destroyed || view.isDestroyed) {
              return
            }
            const annotations = options.annotations().flatMap((annotation) => {
              const range = commentRange(view.state, annotation.anchor)
              return range ? [{ ...annotation, ...range, active: options.activeId() === annotation.id }] : []
            })
            const next = JSON.stringify(annotations.map(({ id, from, to, active }) => [id, from, to, active]))
            if (next === signature) {
              return
            }
            signature = next
            const decorations = annotations.map(({ id, from, to, active }) => Decoration.inline(from, to, {
              'class': `comment-highlight${active ? ' is-active' : ''}`,
              'data-comment-thread': id,
              ...(id === 'draft' ? {} : { 'role': 'button', 'tabindex': '0', 'aria-label': 'Open comment discussion' })
            }))
            view.dispatch(view.state.tr.setMeta(commentHighlightKey, DecorationSet.create(view.state.doc, decorations)).setMeta('addToHistory', false))
          })
        }
        refresh()
        return { update: refresh, destroy: () => {
          destroyed = true
        } }
      }
    })]
  }
})
