import sharp from 'sharp'

const phones = [
  { name: 'splash-iphonese',        w: 750,  h: 1334 },
  { name: 'splash-iphonexr',        w: 828,  h: 1792 },
  { name: 'splash-iphone12',        w: 1170, h: 2532 },
  { name: 'splash-iphone14-pro',    w: 1179, h: 2556 },
  { name: 'splash-iphone13-promax', w: 1284, h: 2778 },
  { name: 'splash-iphone14-promax', w: 1290, h: 2796 },
]

const tablets = [
  { name: 'splash-ipad',            w: 1536, h: 2048 },
  { name: 'splash-ipad-pro-11',     w: 1668, h: 2388 },
  { name: 'splash-ipad-pro-12',     w: 2048, h: 2732 },
]

for (const { name, w, h } of phones) {
  await sharp('public/mobile.png')
    .resize(w, h, { fit: 'cover', position: 'center' })
    .png({ compressionLevel: 9 })
    .toFile(`public/icons/${name}.png`)
  console.log(`${name}.png (${w}x${h})`)
}

for (const { name, w, h } of tablets) {
  await sharp('public/tablet.png')
    .resize(w, h, { fit: 'cover', position: 'center' })
    .png({ compressionLevel: 9 })
    .toFile(`public/icons/${name}.png`)
  console.log(`${name}.png (${w}x${h})`)
}

console.log('done')
