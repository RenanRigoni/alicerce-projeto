import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
const iconsDir = path.join(publicDir, 'icons')

if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true })

const iconSrc  = path.join(publicDir, 'logo_ico.png')
const introSrc = path.join(publicDir, 'intro_app.jpg')

// Brand cream background (#FDF8F3)
const BG = { r: 253, g: 248, b: 243, alpha: 1 }

// ── Regular icons ─────────────────────────────────────────────
const iconSizes = [48, 72, 96, 128, 144, 152, 167, 180, 192, 512]
for (const size of iconSizes) {
  await sharp(iconSrc)
    .resize(size, size, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(iconsDir, `icon-${size}.png`))
  console.log(`icon-${size}.png`)
}

// ── Maskable icons (20% safe-zone padding) ────────────────────
for (const size of [192, 512]) {
  const inner = Math.round(size * 0.8)
  const pad   = Math.round((size - inner) / 2)
  await sharp(iconSrc)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: BG })
    .flatten({ background: BG })
    .png()
    .toFile(path.join(iconsDir, `icon-maskable-${size}.png`))
  console.log(`icon-maskable-${size}.png`)
}

// ── iOS Splash screens ────────────────────────────────────────
// Strategy: resize intro_app.jpg to cover each canvas, add solid border if needed
const splashSizes = [
  { w: 2048, h: 2732, name: 'splash-ipad-pro-12' },
  { w: 1668, h: 2388, name: 'splash-ipad-pro-11' },
  { w: 1536, h: 2048, name: 'splash-ipad' },
  { w: 1290, h: 2796, name: 'splash-iphone14-promax' },
  { w: 1284, h: 2778, name: 'splash-iphone13-promax' },
  { w: 1179, h: 2556, name: 'splash-iphone14-pro' },
  { w: 1170, h: 2532, name: 'splash-iphone12' },
  { w: 828,  h: 1792, name: 'splash-iphonexr' },
  { w: 750,  h: 1334, name: 'splash-iphonese' },
]

for (const { w, h, name } of splashSizes) {
  await sharp(introSrc)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90 })
    .toFile(path.join(iconsDir, `${name}.jpg`))
  console.log(`${name}.jpg (${w}x${h})`)
}

console.log('\nDone! All PWA assets generated.')
