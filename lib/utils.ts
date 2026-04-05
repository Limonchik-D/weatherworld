/* ══════════════════════════════════════
   WeatherWorld – shared utility functions
   ══════════════════════════════════════ */

/** WeatherAPI condition code → emoji */
export function wIcon(code?: number, isDay: 0 | 1 = 1): string {
  if (!code) return isDay ? '🌤' : '🌙';
  if (code === 1000) return isDay ? '☀️' : '🌙';
  if (code <= 1003) return isDay ? '⛅' : '☁️';
  if (code <= 1009) return '☁️';
  if (code <= 1030) return '🌫️';
  if (code <= 1072) return '🌦️';
  if (code <= 1087) return '⛈️';
  if (code <= 1117) return '🌨️';
  if (code <= 1147) return '🌫️';
  if (code <= 1201) return '🌧️';
  if (code <= 1237) return '❄️';
  if (code <= 1282) return '⛈️';
  /* OWM codes */
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌦️';
  if (code >= 500 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800) return isDay ? '☀️' : '🌙';
  if (code > 800) return isDay ? '⛅' : '☁️';
  return '🌤';
}

const DIRS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'] as const;
export function windDir(deg?: number): string {
  if (deg == null) return '';
  return DIRS[Math.round(deg / 45) % 8];
}

export function unixTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function moonPhase(v?: number): string {
  if (v == null) return '—';
  if (v === 0 || v === 1) return 'Новолуние';
  if (v < 0.25) return 'Растущий серп';
  if (v === 0.25) return '1-я четверть';
  if (v < 0.5) return 'Растущая луна';
  if (v === 0.5) return 'Полнолуние';
  if (v < 0.75) return 'Убывающая луна';
  if (v === 0.75) return 'Последняя четверть';
  return 'Убывающий серп';
}

const MOON_EMOJI: Record<string, string> = {
  'Новолуние': '🌑', 'Растущий серп': '🌒', '1-я четверть': '🌓',
  'Растущая луна': '🌔', 'Полнолуние': '🌕', 'Убывающая луна': '🌖',
  'Последняя четверть': '🌗', 'Убывающий серп': '🌘',
};
export function moonEmoji(phase: string): string {
  return MOON_EMOJI[phase] ?? '🌙';
}

export function escHtml(s: unknown): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Stable cache key without slice collision */
export function cacheKey(url: string): string {
  try {
    return btoa(encodeURIComponent(url));
  } catch {
    return url
      .split('')
      .reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) | 0, 0)
      .toString(36);
  }
}

/* ── PDF export (lazy-loads html2canvas + jsPDF) ── */
export async function exportPDF(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf').then((m) => ({ jsPDF: m.jsPDF })),
  ]);

  // Hide elements marked as data-no-export (ads, widget button, footer)
  const noExport = Array.from(element.querySelectorAll('[data-no-export]')) as HTMLElement[];
  noExport.forEach(el => el.style.setProperty('display', 'none', 'important'));

  let cv: HTMLCanvasElement;
  try {
    cv = await html2canvas(element, {
      backgroundColor: '#0d0718',
      scale: 1.4,
      useCORS: true,
      logging: false,
    });
  } finally {
    noExport.forEach(el => el.style.removeProperty('display'));
  }

  // Watermark
  const ctx = cv.getContext('2d');
  if (ctx) {
    const fz = Math.max(11, Math.round(cv.width * 0.02));
    ctx.save();
    ctx.font = `600 ${fz}px Inter, -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(192,132,252,0.5)';
    ctx.fillText('weatherworld.app', cv.width - 12, cv.height - 10);
    ctx.restore();
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ratio = pw / cv.width;
  let y = 0;
  while (y < cv.height) {
    const sliceH = Math.min(cv.height - y, ph / ratio);
    const tmp = document.createElement('canvas');
    tmp.width = cv.width;
    tmp.height = sliceH;
    tmp.getContext('2d')!.drawImage(cv, 0, -y);
    if (y > 0) pdf.addPage();
    pdf.addImage(tmp.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, pw, sliceH * ratio);
    y += sliceH;
  }
  pdf.save(filename);
}

/* ── Image (JPG/PNG) export ── */
export async function exportImage(
  element: HTMLElement,
  filename: string,
  format: 'jpg' | 'png' = 'jpg',
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');

  // Hide no-export elements
  const noExport = Array.from(element.querySelectorAll('[data-no-export]')) as HTMLElement[];
  noExport.forEach(el => el.style.setProperty('display', 'none', 'important'));

  let cv: HTMLCanvasElement;
  try {
    cv = await html2canvas(element, {
      backgroundColor: '#0d0718',
      scale: 2,
      useCORS: true,
      logging: false,
    });
  } finally {
    noExport.forEach(el => el.style.removeProperty('display'));
  }

  // Watermark
  const ctx = cv.getContext('2d');
  if (ctx) {
    const fz = Math.max(12, Math.round(cv.width * 0.02));
    ctx.save();
    ctx.font = `600 ${fz}px Inter, -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 5;
    ctx.fillStyle = 'rgba(192,132,252,0.5)';
    ctx.fillText('weatherworld.app', cv.width - 14, cv.height - 12);
    ctx.restore();
  }

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'png' ? undefined : 0.92;
  const dataUrl = cv.toDataURL(mimeType, quality);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
