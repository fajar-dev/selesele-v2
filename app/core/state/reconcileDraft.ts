/** Refresh untouched fields while preserving a user's independent unsaved edits. */
export function reconcileDraft<T extends object>(draft: T, previous: T | undefined, incoming: T): T {
  if (!previous) {
    return structuredClone(incoming)
  }
  const merged = { ...draft }
  for (const key of Object.keys(incoming) as (keyof T)[]) {
    if (JSON.stringify(draft[key]) === JSON.stringify(previous[key])) {
      merged[key] = structuredClone(incoming[key])
    }
  }
  return merged
}
