export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export function attachmentType(data: Uint8Array, name: string): string {
  if (!data.length || data.length > MAX_ATTACHMENT_BYTES) {
    throw new Error('Choose a file between 1 byte and 10 MB')
  }
  const start = [...data.slice(0, 12)], text = new TextDecoder().decode(data.slice(0, 16))
  if (start.slice(0, 8).join() === '137,80,78,71,13,10,26,10') {
    return 'image/png'
  }
  if (start[0] === 255 && start[1] === 216 && start[2] === 255) {
    return 'image/jpeg'
  }
  if (text.startsWith('GIF87a') || text.startsWith('GIF89a')) {
    return 'image/gif'
  }
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') {
    return 'image/webp'
  }
  if (text.startsWith('%PDF-')) {
    return 'application/pdf'
  }
  if (start[0] === 80 && start[1] === 75 && start[2] === 3 && start[3] === 4) {
    return 'application/zip'
  }
  if (/\.(txt|csv|md|json)$/i.test(name)) {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(data)
    if (decoded.includes('\0')) {
      throw new Error('This file is not plain text')
    }
    return 'text/plain'
  }
  throw new Error('Supported files: images, PDF, text/CSV/Markdown/JSON, ZIP and Office documents')
}
export function attachmentName(name: string) {
  return name.replace(/[\\/\r\n\0]/g, '_').trim().slice(0, 255) || 'attachment'
}
