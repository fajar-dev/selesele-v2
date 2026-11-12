export function formatPageCount(count: number) {
  return `${count} ${count === 1 ? 'page' : 'pages'}`
}
