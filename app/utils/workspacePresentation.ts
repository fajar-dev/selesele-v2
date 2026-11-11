const tones = ['clay', 'sage', 'sky', 'plum'] as const

export function workspaceTone(seed: string) {
  let hash = 0
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return tones[hash % tones.length]!
}
