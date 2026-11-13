export interface DiffLine {
  kind: 'same' | 'add' | 'remove'
  text: string
}
/** Exact bounded LCS for normal edits; large replacements remain lossless without quadratic work. */
export function lineDiff(before: string, after: string): DiffLine[] {
  if (before === after) {
    return before.split('\n').map(text => ({ kind: 'same', text }))
  }
  const left = before.split('\n'), right = after.split('\n')
  let prefix = 0, suffix = 0
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) {
    prefix++
  }
  while (suffix < left.length - prefix && suffix < right.length - prefix && left[left.length - 1 - suffix] === right[right.length - 1 - suffix]) {
    suffix++
  }
  const a = left.slice(prefix, left.length - suffix), b = right.slice(prefix, right.length - suffix)
  const middle: DiffLine[] = []
  if (a.length * b.length > 250000) {
    middle.push(...a.map(text => ({ kind: 'remove' as const, text })), ...b.map(text => ({ kind: 'add' as const, text })))
  } else {
    const matrix = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        matrix[i]![j] = a[i] === b[j] ? matrix[i + 1]![j + 1]! + 1 : Math.max(matrix[i + 1]![j]!, matrix[i]![j + 1]!)
      }
    }
    let i = 0, j = 0
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) {
        middle.push({ kind: 'same', text: a[i++]! })
        j++
      } else if (j < b.length && (i === a.length || matrix[i]![j + 1]! > matrix[i + 1]![j]!)) {
        middle.push({ kind: 'add', text: b[j++]! })
      } else {
        middle.push({ kind: 'remove', text: a[i++]! })
      }
    }
  }
  return [...left.slice(0, prefix).map(text => ({ kind: 'same' as const, text })), ...middle, ...left.slice(left.length - suffix).map(text => ({ kind: 'same' as const, text }))]
}
