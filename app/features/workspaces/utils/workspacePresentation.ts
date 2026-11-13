export function formatItemCount(count: number) {
  return `${count} ${count === 1 ? 'item' : 'items'}`
}
