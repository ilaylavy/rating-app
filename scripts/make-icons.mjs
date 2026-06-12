// Generates the PWA icon set into public/icons from an inline SVG.
// Run once with: node scripts/make-icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const outDir = new URL('../public/icons/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

function starPoints(cx, cy, outer, inner) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const svg = (starScale = 1, rounded = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2b2f3a"/>
      <stop offset="100%" stop-color="#14161c"/>
    </linearGradient>
    <linearGradient id="star" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbd065"/>
      <stop offset="100%" stop-color="#ef8a3a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <polygon points="${starPoints(256, 268, 170 * starScale, 66 * starScale)}" fill="url(#star)"/>
</svg>`

const jobs = [
  ['icon-192.png', svg(), 192],
  ['icon-512.png', svg(), 512],
  ['icon-512-maskable.png', svg(0.74, false), 512],
  ['apple-touch-icon.png', svg(1, false), 180],
]

for (const [name, source, size] of jobs) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(outDir + name)
  console.log('wrote', name)
}
