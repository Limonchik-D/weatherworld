// Resize logo.png into PWA icon sizes
// Run: node scripts/resize-icons.mjs
import sharp from 'sharp';
import { existsSync } from 'fs';

const src = 'public/icons/logo.png';
if (!existsSync(src)) {
  console.error('❌ Сначала сохраните логотип как public/icons/logo.png');
  process.exit(1);
}

const sizes = [192, 512];

for (const size of sizes) {
  // Regular icon (with transparency)
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`);

  // Maskable icon (with solid background, safe zone padding)
  const padding = Math.round(size * 0.1);
  const inner = size - padding * 2;
  await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 10, g: 0, b: 21, alpha: 1 }, // #0a0015
    })
    .png()
    .toFile(`public/icons/icon-${size}x${size}-maskable.png`);

  console.log(`✅ ${size}x${size}`);
}

// Favicon 32x32
await sharp(src)
  .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/favicon.png');

console.log('✅ favicon.png');
console.log('🎉 Все иконки сгенерированы!');
