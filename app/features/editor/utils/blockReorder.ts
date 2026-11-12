import { Selection, type EditorState, type Transaction } from '@tiptap/pm/state'

/** Move complete document blocks without letting a drop split or join their content. */
export function reorderSelectedBlocks(state: EditorState, target: number): Transaction | null {
  const { doc, selection } = state
  const { from, to, $from, $to } = selection
  if (selection.empty || $from.depth !== 0 || $to.depth !== 0
    || target < 0 || target > doc.content.size || doc.resolve(target).depth !== 0
    || (target >= from && target <= to)) {
    return null
  }

  const content = doc.slice(from, to).content
  const transaction = state.tr.delete(from, to)
  const destination = transaction.mapping.map(target)
  transaction.insert(destination, content)
  transaction.setSelection(Selection.near(transaction.doc.resolve(destination), 1))
  return transaction.setMeta('uiEvent', 'drop').scrollIntoView()
}
