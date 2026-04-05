// Generate PWA icons as simple PNG files using Canvas API (Node 21+)
// Run: node scripts/generate-icons.mjs

import { writeFileSync } from 'fs';

// Minimal PNG generator — creates a solid colored icon with "WW" text
// We'll use a simple approach: create an SVG and reference it, then provide
// actual PNG files via a lightweight canvas approach.

// For simplicity, let's create SVG icons that browsers accept for PWA
const sizes = [192, 512];

function createSVG(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const inner = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = inner * 0.32;
  const subSize = inner * 0.12;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0a2e"/>
      <stop offset="100%" stop-color="#2d1b69"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#e879f9"/>
    </linearGradient>
  </defs>
  ${maskable ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>` : `<rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${inner * 0.18}" fill="url(#bg)"/>`}
  <text x="${cx}" y="${cy + fontSize * 0.1}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fontSize}" fill="url(#accent)" text-anchor="middle" dominant-baseline="middle">WW</text>
  <text x="${cx}" y="${cy + fontSize * 0.7}" font-family="Arial,Helvetica,sans-serif" font-weight="400" font-size="${subSize}" fill="rgba(248,244,255,0.6)" text-anchor="middle" dominant-baseline="middle">weather</text>
  <!-- Sun icon -->
  <circle cx="${cx + inner * 0.28}" cy="${cy - inner * 0.22}" r="${inner * 0.06}" fill="#fbbf24" opacity="0.9"/>
  <!-- Cloud -->
  <ellipse cx="${cx - inner * 0.25}" cy="${cy - inner * 0.26}" rx="${inner * 0.1}" ry="${inner * 0.055}" fill="rgba(248,244,255,0.3)"/>
</svg>`;
}

for (const size of sizes) {
  // Regular icon
  writeFileSync(`public/icons/icon-${size}x${size}.svg`, createSVG(size, false));
  // Maskable icon (for Android adaptive icons)
  writeFileSync(`public/icons/icon-${size}x${size}-maskable.svg`, createSVG(size, true));
}

// Create a simple favicon SVG
const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0a2e"/>
      <stop offset="100%" stop-color="#2d1b69"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#e879f9"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#bg)"/>
  <text x="16" y="20" font-family="Arial,sans-serif" font-weight="700" font-size="13" fill="url(#accent)" text-anchor="middle">W</text>
</svg>`;
writeFileSync('public/favicon.svg', faviconSVG);

console.log('✅ Icons generated in public/icons/');
