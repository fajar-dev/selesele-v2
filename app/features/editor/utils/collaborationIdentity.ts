const colors = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6']

export function collaborationColor(identity: string): string {
  let hash = 0
  for (const character of identity) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0
  }
  return colors[Math.abs(hash) % colors.length]!
}
