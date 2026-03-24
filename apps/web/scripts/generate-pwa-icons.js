// Run with: node scripts/generate-pwa-icons.js
// Requires: sharp (available in monorepo node_modules)
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const srcSvg = path.join(__dirname, '../public/lx2-logo.svg')
const outDir = path.join(__dirname, '../public/icons')

fs.mkdirSync(outDir, { recursive: true })

const BG = { r: 10, g: 31, b: 10, alpha: 1 } // #0a1f0a

async function generate() {
  const svgBuf = fs.readFileSync(srcSvg)

  // icon-192.png — plain, no padding needed
  await sharp(svgBuf)
    .resize(192, 192, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(outDir, 'icon-192.png'))
  console.log('✓ icon-192.png')

  // icon-512.png — plain
  await sharp(svgBuf)
    .resize(512, 512, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(outDir, 'icon-512.png'))
  console.log('✓ icon-512.png')

  // icon-512-maskable.png — logo within central 80% safe zone (≈410×410)
  // Logo rendered at 410×410, then padded to 512×512 with bg colour
  const logoLayer = await sharp(svgBuf)
    .resize(410, 410, { fit: 'contain', background: BG })
    .png()
    .toBuffer()

  await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
    .composite([{ input: logoLayer, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-512-maskable.png'))
  console.log('✓ icon-512-maskable.png')

  // apple-touch.png — 180×180
  await sharp(svgBuf)
    .resize(180, 180, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(outDir, 'apple-touch.png'))
  console.log('✓ apple-touch.png')

  console.log('\nAll icons generated in public/icons/')
}

generate().catch(err => { console.error(err); process.exit(1) })
