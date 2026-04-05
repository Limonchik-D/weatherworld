// Resize logo.png into PWA icon sizes
// Run: node scripts/resize-icons.mjs
import sharp from 'sharp';
import { existsSync } from 'fs';

const src = 'public/icons/logo.png';
if (!existsSync(src)) {
  console.error('❌ Сначала сохраните логотип как public/icons/logo.png');
  process.exit(1);
}

const BG = { r: 10, g: 0, b: 21 }; // #0a0015

/** Remove near-white pixels from a PNG buffer, replace with BG color */
async function removeBg(inputBuf) {
  const { data, info } = await sharp(inputBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels === 4
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Threshold: near-white pixel → replace with BG (keep logo art)
    if (r > 210 && g > 210 && b > 210) {
      data[i]     = BG.r;
      data[i + 1] = BG.g;
      data[i + 2] = BG.b;
      data[i + 3] = 255;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

const sizes = [192, 512];

for (const size of sizes) {
  // Regular icon — dark background instead of white
  const resizedBuf = await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: BG.r, g: BG.g, b: BG.b, alpha: 1 } })
    .png()
    .toBuffer();
  const cleanBuf = await removeBg(resizedBuf);
  await sharp(cleanBuf).toFile(`public/icons/icon-${size}x${size}.png`);

  // Maskable icon — solid dark background, 10% safe-zone padding
  const padding = Math.round(size * 0.1);
  const inner = size - padding * 2;
  const innerBuf = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: BG.r, g: BG.g, b: BG.b, alpha: 1 } })
    .png()
    .toBuffer();
  const cleanInner = await removeBg(innerBuf);
  await sharp(cleanInner)
    .extend({
      top: padding, bottom: padding, left: padding, right: padding,
      background: { ...BG, alpha: 1 },
    })
    .png()
    .toFile(`public/icons/icon-${size}x${size}-maskable.png`);

  console.log(`✅ ${size}x${size}`);
}

// Favicon 32x32
const favBuf = await sharp(src)
  .resize(32, 32, { fit: 'contain', background: { r: BG.r, g: BG.g, b: BG.b, alpha: 1 } })
  .png()
  .toBuffer();
const favClean = await removeBg(favBuf);
await sharp(favClean).toFile('public/favicon.png');

console.log('✅ favicon.png');
console.log('🎉 Все иконки сгенерированы!');
