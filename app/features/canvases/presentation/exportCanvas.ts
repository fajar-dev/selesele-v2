/** Rasterize a self-contained SVG; cap the bitmap to avoid excessive canvas memory. */
export async function exportCanvasPng(svg: string, filename: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(2, 8192 / Math.max(image.naturalWidth, image.naturalHeight), Math.sqrt(16000000 / (image.naturalWidth * image.naturalHeight)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Image export is unavailable in this browser')
    }
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to export image')), 'image/png'))
    downloadBlob(blob, filename)
  } finally {
    URL.revokeObjectURL(url)
  }
}
/** Embed authorized same-item image attachments so exported SVG/PNG remains self-contained. */
export async function embedCanvasImages(svg: string) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  for (const image of document.querySelectorAll('image')) {
    const href = image.getAttribute('href') || ''
    if (!/^\/api\/items\/[a-f0-9-]{36}\/attachments\/[a-f0-9-]{36}\/content$/.test(href)) {
      throw new Error('An image attachment reference is invalid')
    }
    const response = await fetch(href, { credentials: 'same-origin' })
    if (!response.ok) {
      throw new Error('An image attachment is no longer accessible')
    }
    const blob = await response.blob()
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    image.setAttribute('href', encoded)
  }
  return new XMLSerializer().serializeToString(document.documentElement)
}
