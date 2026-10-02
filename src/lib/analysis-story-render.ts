/** Public-data PNG; essential content stays inside y=250–1650. */
import QRCode from 'qrcode';
import { STORY_HEIGHT, STORY_WIDTH, type StoryPublicPayload, type StoryPublicMetric } from '@/lib/analysis-story-card';
import { storyPalette, type StoryTemplateId } from '@/lib/analysis-story-templates';
const FONT = 'Vazirmatn';
let fontReady: Promise<void> | null = null;
export async function ensureStoryFont(): Promise<void> {
  if (!fontReady) fontReady = (async () => {
    const face = await new FontFace(FONT, 'url(/fonts/Vazirmatn.woff2)', { weight: '100 900' }).load();
    document.fonts.add(face);
    await document.fonts.ready;
  })().catch(error => { fontReady = null; throw error; });
  return fontReady;
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('بارگذاری تصویر ممکن نشد؛ دوباره تلاش کنید.'));
    image.src = src;
  });
}
export async function renderAnalysisStoryPng(payload: StoryPublicPayload, options?: { template?: StoryTemplateId; dark?: boolean }): Promise<Blob> {
  const template = options?.template ?? 'vault_dark';
  const palette = storyPalette(options?.dark === false ? 'studio_light' : 'vault_dark');
  const [logo] = await Promise.all([loadImage('/icons/app-192.png'), ensureStoryFont()]);
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH; canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, palette.bg); gradient.addColorStop(1, palette.bg2);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1920);
  ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  function text(value: string, x: number, y: number, width: number, size: number, color: string, maxLines = 3, weight = 600) {
    let lines: string[] = [];
    for (;;) {
      ctx!.font = `${weight} ${size}px ${FONT}`;
      lines = []; let line = '';
      for (const word of value.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx!.measureText(next).width > width) { lines.push(line); line = word; }
        else line = next;
      }
      if (line) lines.push(line);
      if ((lines.length <= maxLines && lines.every(item => ctx!.measureText(item).width <= width)) || size <= 18) break;
      size -= 2;
    }
    ctx!.fillStyle = color;
    lines.forEach((line, i) => ctx!.fillText(line, x, y + i * size * 1.6));
  }
  function metric(item: StoryPublicMetric, x: number, y: number, width: number, height: number, large = false) {
    ctx!.fillStyle = palette.card;
    ctx!.beginPath(); ctx!.roundRect(x, y, width, height, 24); ctx!.fill();
    const right = x + width - 28;
    const color = item.tone === 'below' ? (options?.dark === false ? '#0369a1' : '#7dd3fc')
      : item.tone === 'above' ? (options?.dark === false ? '#92400e' : '#fbbf24') : palette.muted;
    text(item.label, right, y + 24, width - 56, 28, palette.text, 2);
    text(item.value, right, y + (large ? 115 : 100), width - 56, large ? 108 : 66, color, 1, 800);
    text(`${item.meaning} · ${item.unit}`, right, y + height - 90, width - 56, 24, palette.muted, 2);
  }
  ctx.drawImage(logo, 924, 260, 84, 84);
  text(payload.brand, 902, 275, 700, 42, palette.accent, 1, 800);
  text('بازار را ببین؛ اختلاف قیمت‌ها را بفهم.', 1008, 378, 936, 42, palette.text, 2, 800);
  text(payload.observedLabel, 1008, 472, 936, 24, palette.muted, 2);
  const metrics = payload.metrics;
  if (template === 'dual_metal') {
    const gold = metrics.find(item => /طلا/.test(item.label) && !/دلار|نسبت/.test(item.label));
    const silver = metrics.find(item => /^نقره/.test(item.label));
    [gold, silver].forEach((item, i) => metric(item ?? { label: i === 0 ? 'طلا' : 'نقره', value: '—', unit: '', tone: 'missing', meaning: 'در این گزارش موجود نیست' }, 72 + (1 - i) * 480, 570, 456, 390, true));
  } else if (template === 'studio_light') {
    text(payload.title, 1008, 552, 936, 34, palette.accent, 1, 800);
    if (metrics[0]) metric(metrics[0], 72, 626, 936, 370, true);
    else text('قیمت معتبر در دسترس نیست', 1008, 680, 936, 48, palette.muted);
  } else {
    text('نبض بازار', 1008, 552, 936, 34, palette.accent, 1, 800);
    metrics.slice(0, 3).forEach((item, i) => metric(item, 72 + (2 - i) * 316, 626, 304, 380));
    if (!metrics.length) text('قیمت معتبر در دسترس نیست', 1008, 680, 936, 48, palette.muted);
  }
  text(payload.takeaway, 1008, 1060, 936, 34, palette.text, 3);
  text(payload.disclaimer, 1008, 1260, 936, 24, palette.muted, 1);
  const qr = await QRCode.toDataURL(payload.url, { errorCorrectionLevel: 'M', margin: 4, width: 252, color: { dark: '#101010', light: '#ffffff' } });
  ctx.drawImage(await loadImage(qr), 72, 1370, 252, 252);
  text(payload.linkLabel, 1008, 1394, 628, 36, palette.accent, 2, 800);
  text(new URL(payload.url).hostname, 1008, 1510, 628, 28, palette.text, 1);
  if (payload.planBadge) text(payload.planBadge, 1008, 1570, 628, 22, palette.muted, 1);
  if (payload.testDataLabel) text(payload.testDataLabel, 1008, 1680, 936, 24, palette.accent, 1);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png_encode_failed');
  return blob;
}
