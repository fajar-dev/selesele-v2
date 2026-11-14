import type { EditorState } from '@tiptap/pm/state'
import { absolutePositionToRelativePosition, relativePositionToAbsolutePosition, ySyncPluginKey } from '@tiptap/y-tiptap'
import * as Y from 'yjs'
import type { CommentAnchor, RelativeTextPosition } from '#shared/kernel/comment'

type Mapping = Parameters<typeof absolutePositionToRelativePosition>[2]
interface BindingState { doc: Y.Doc, type: Y.XmlFragment, binding: { mapping: Mapping } }
export function resolveTextRange(state: EditorState, anchor: CommentAnchor): { from: number, to: number } | null {
  if ('kind' in anchor) {
    return null
  }
  const binding = ySyncPluginKey.getState(state) as BindingState | undefined
  if (!binding?.binding) {
    return null
  }
  try {
    const resolve = (position: RelativeTextPosition) => relativePositionToAbsolutePosition(binding.doc, binding.type, Y.createRelativePositionFromJSON(position), binding.binding.mapping)
    const from = resolve(anchor.from)
    const to = resolve(anchor.to)
    return from !== null && to !== null && from >= 0 && to <= state.doc.content.size && from <= to ? { from, to } : null
  } catch {
    return null
  }
}

export function captureTextRange(state: EditorState, from: number, to: number) {
  const binding = ySyncPluginKey.getState(state) as BindingState | undefined
  if (!binding?.binding) {
    return null
  }
  const encode = (pos: number, association: number): RelativeTextPosition | null => {
    const relative = absolutePositionToRelativePosition(pos, binding.type, binding.binding.mapping)
    const absolute = Y.createAbsolutePositionFromRelativePosition(relative, binding.doc)
    if (!absolute) {
      return null
    }
    // Tie the start to the first selected character, and the end to the last.
    // Text inserted immediately outside either boundary stays outside the comment.
    return Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(absolute.type, absolute.index, association))
  }
  const anchorFrom = encode(from, from === to ? -1 : 0)
  const anchorTo = encode(to, -1)
  return anchorFrom && anchorTo ? { from: anchorFrom, to: anchorTo } : null
}
