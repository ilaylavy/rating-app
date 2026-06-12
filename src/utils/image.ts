const FULL_MAX = 1600
const THUMB_MAX = 360

async function decodeImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function drawScaled(src: ImageBitmap | HTMLImageElement, maxDim: number, quality: number): Promise<Blob> {
  const w = src.width
  const h = src.height
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      'image/jpeg',
      quality,
    )
  })
}

/** Downscale + JPEG-compress a picked photo into a full-size and a thumbnail blob. */
export async function processPhoto(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  const src = await decodeImage(file)
  try {
    const full = await drawScaled(src, FULL_MAX, 0.82)
    const thumb = await drawScaled(src, THUMB_MAX, 0.75)
    return { full, thumb }
  } finally {
    if ('close' in src) src.close()
  }
}
