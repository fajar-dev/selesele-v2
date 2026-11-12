import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { reorderSelectedBlocks } from '../utils/blockReorder'

const blockDragKey = new PluginKey<boolean>('blockDragDrop')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockDragDrop: {
      beginBlockDrag: () => ReturnType
      endBlockDrag: () => ReturnType
    }
  }
}

function dropBoundary(view: EditorView, event: DragEvent): number | null {
  const hit = view.posAtCoords({ left: event.clientX, top: event.clientY })
  if (!hit) {
    return null
  }
  const position = view.state.doc.resolve(hit.pos)
  if (position.depth === 0) {
    return position.pos
  }

  const start = position.before(1)
  const element = view.nodeDOM(start)
  if (!(element instanceof HTMLElement)) {
    return null
  }
  const bounds = element.getBoundingClientRect()
  return event.clientY < bounds.top + bounds.height / 2 ? start : position.after(1)
}

/** Grip drags reorder whole blocks; ordinary text and external drops stay native. */
export const BlockDragDrop = Extension.create({
  name: 'blockDragDrop',

  addCommands() {
    return {
      beginBlockDrag: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(blockDragKey, true)
        }
        return true
      },
      endBlockDrag: () => ({ tr, dispatch }) => {
        if (dispatch) {
          // Clear the handle's cached node as well, so hovering the same block
          // after a cancelled or completed drag can show its controls again.
          tr.setMeta(blockDragKey, false).setMeta('hideDragHandle', true)
        }
        return true
      }
    }
  },

  addProseMirrorPlugins() {
    let indicator: HTMLDivElement | null = null
    let pointer: DragEvent | null = null

    const clearIndicator = () => {
      indicator?.remove()
      indicator = null
    }

    const showIndicator = (view: EditorView, target: number) => {
      const { doc, selection } = view.state
      if (target >= selection.from && target <= selection.to) {
        clearIndicator()
        return
      }
      const position = doc.resolve(target)
      const before = position.nodeBefore
      const after = position.nodeAfter
      const previous = before ? view.nodeDOM(target - before.nodeSize) : null
      const next = after ? view.nodeDOM(target) : null
      const previousBounds = previous instanceof HTMLElement ? previous.getBoundingClientRect() : null
      const nextBounds = next instanceof HTMLElement ? next.getBoundingClientRect() : null
      const bounds = nextBounds ?? previousBounds
      if (!bounds) {
        return
      }
      const top = previousBounds && nextBounds
        ? (previousBounds.bottom + nextBounds.top) / 2
        : nextBounds?.top ?? previousBounds!.bottom
      if (!indicator) {
        indicator = document.createElement('div')
        indicator.className = 'editor-block-drop-indicator'
        indicator.setAttribute('aria-hidden', 'true')
        document.body.append(indicator)
      }
      Object.assign(indicator.style, {
        left: `${bounds.left}px`, top: `${top - 1}px`, width: `${bounds.width}px`
      })
    }

    return [new Plugin<boolean>({
      key: blockDragKey,
      state: {
        init: () => false,
        apply: (transaction, active) => transaction.getMeta(blockDragKey) ?? active
      },
      props: {
        handleDOMEvents: {
          dragover: (view, event) => {
            if (!blockDragKey.getState(view.state) || !view.dragging) {
              return false
            }
            pointer = event
            const target = dropBoundary(view, event)
            if (target === null) {
              clearIndicator()
            } else {
              showIndicator(view, target)
            }
            event.preventDefault()
            // Suppress the native text drop cursor, whose target differs from a block boundary.
            event.stopImmediatePropagation()
            return true
          },
          dragleave: (view, event) => {
            if (!view.dom.contains(event.relatedTarget as Node | null)) {
              pointer = null
              clearIndicator()
            }
            return false
          }
        },
        handleDrop: (view, event) => {
          if (!blockDragKey.getState(view.state) || !view.dragging) {
            return false
          }
          const target = dropBoundary(view, event)
          const transaction = target === null ? null : reorderSelectedBlocks(view.state, target)
          pointer = null
          clearIndicator()
          view.dispatch((transaction ?? view.state.tr).setMeta(blockDragKey, false))
          view.focus()
          return true
        }
      },
      view: (view) => {
        const refresh = () => {
          if (!pointer || !blockDragKey.getState(view.state)) {
            return
          }
          const target = dropBoundary(view, pointer)
          if (target !== null) {
            showIndicator(view, target)
          } else {
            clearIndicator()
          }
        }
        const finish = () => {
          pointer = null
          clearIndicator()
          if (!view.isDestroyed && blockDragKey.getState(view.state)) {
            view.dispatch(view.state.tr.setMeta(blockDragKey, false))
          }
        }
        document.addEventListener('dragend', finish)
        document.addEventListener('drop', finish)
        document.addEventListener('scroll', refresh, true)
        return {
          update: () => {
            if (!blockDragKey.getState(view.state)) {
              clearIndicator()
            } else {
              refresh()
            }
          },
          destroy: () => {
            clearIndicator()
            document.removeEventListener('dragend', finish)
            document.removeEventListener('drop', finish)
            document.removeEventListener('scroll', refresh, true)
          }
        }
      }
    })]
  }
})
