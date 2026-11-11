const invalidCharacters = new Set(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])

export function sanitizeFilename(filename: string): string {
  return Array.from(filename, character => character.charCodeAt(0) < 32 || invalidCharacters.has(character) ? '_' : character).join('')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeFilename(filename)
  document.body.append(link)

  try {
    link.click()
  } finally {
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
