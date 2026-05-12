import sharp from 'sharp'
import { renameSync } from 'fs'

const src = 'public/logo_ico.png'
const BG  = { r: 253, g: 248, b: 243, alpha: 1 }
const dir = 'public/icons'

for (const size of [48, 72, 96, 128, 144, 152, 167, 180, 192, 512]) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: BG })
    .png({ compressionLevel: 9 })
    .toFile(`${dir}/icon-${size}.png`)
  console.log(`icon-${size}.png`)
}

for (const size of [192, 512]) {
  const inner = Math.round(size * 0.8)
  const pad   = Math.round((size - inner) / 2)
  await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: BG })
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(`${dir}/icon-maskable-${size}.png`)
  console.log(`icon-maskable-${size}.png`)
}

await sharp(src)
  .resize(512, 512, { fit: 'contain', background: BG })
  .png({ compressionLevel: 9, effort: 10 })
  .toFile('public/logo_ico_opt.png')

renameSync('public/logo_ico_opt.png', 'public/logo_ico.png')
console.log('logo_ico.png → 512px otimizado')
