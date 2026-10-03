/** Public-data PNG; space reserved for Instagram controls. */
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
  const glow = ctx.createRadialGradient(540, 680, 20, 540, 680, 650);
  glow.addColorStop(0, options?.dark === false ? '#c59b3d33' : '#d2a84a25');
  glow.addColorStop(1, '#c59b3d00');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1920);
  ctx.strokeStyle = palette.cardBorder; ctx.lineWidth = 1;
  for (let x = 72; x < 1080; x += 156) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1920); ctx.stroke();
  }
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
    ctx!.strokeStyle = palette.cardBorder; ctx!.lineWidth = 2; ctx!.stroke();
    const right = x + width - 28;
    const color = item.tone === 'below' ? (options?.dark === false ? '#0369a1' : '#7dd3fc')
      : item.tone === 'above' ? (options?.dark === false ? '#92400e' : '#fbbf24') : palette.muted;
    if (height < 180) {
      text(item.label, right, y + 18, width - 310, 27, palette.text, 2);
      text(item.value, x + 262, y + 32, 234, 54, color, 1, 800);
      text(`${item.meaning} · ${item.unit}`, right, y + 76, width - 310, 20, palette.muted, 1);
    } else {
      text(item.label, right, y + 24, width - 56, 28, palette.text, 2);
      text(item.value, right, y + 104, width - 56, large ? 94 : 66, color, 1, 800);
      text(`${item.meaning} · ${item.unit}`, right, y + height - 75, width - 56, 23, palette.muted, 2);
    }
  }
  function coin(x: number, y: number, radius: number, silver: boolean, token: string) {
    ctx!.save();
    ctx!.shadowColor = '#0006'; ctx!.shadowBlur = 32; ctx!.shadowOffsetY = 16;
    const metal = ctx!.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    [silver ? '#f4f8ff' : '#fff0b5', silver ? '#8c9bae' : '#ae7523', silver ? '#d7e0ed' : '#eecb76'].forEach((color, i) => metal.addColorStop(i / 2, color));
    ctx!.fillStyle = metal; ctx!.beginPath(); ctx!.arc(x, y, radius, 0, Math.PI * 2); ctx!.fill();
    ctx!.shadowColor = 'transparent'; ctx!.lineWidth = 2; ctx!.strokeStyle = silver ? '#607086' : '#8a5d1d';
    ctx!.beginPath(); ctx!.arc(x, y, radius - 8, 0, Math.PI * 2); ctx!.stroke();
    ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'; ctx!.font = `800 ${radius * .7}px ${FONT}`;
    ctx!.fillStyle = silver ? '#354253' : '#684312'; ctx!.fillText(token, x, y + 2); ctx!.restore();
  }
  function bullion(x: number, y: number) {
    ctx!.save(); ctx!.translate(x, y); ctx!.rotate(-.18);
    ctx!.shadowColor = '#0007'; ctx!.shadowBlur = 35; ctx!.shadowOffsetY = 20;
    const gold = ctx!.createLinearGradient(-150, -95, 150, 110);
    gold.addColorStop(0, '#fff0b7'); gold.addColorStop(.38, '#d1a84f'); gold.addColorStop(.55, '#ffe8a0'); gold.addColorStop(1, '#966321');
    ctx!.fillStyle = gold; ctx!.beginPath(); ctx!.moveTo(-110, -88); ctx!.lineTo(110, -88); ctx!.lineTo(151, 94); ctx!.quadraticCurveTo(0, 122, -151, 94); ctx!.closePath(); ctx!.fill();
    ctx!.shadowColor = 'transparent'; ctx!.strokeStyle = '#fff2b9'; ctx!.lineWidth = 3; ctx!.stroke();
    ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'; ctx!.fillStyle = '#79541e';
    ctx!.font = `800 58px ${FONT}`; ctx!.fillText('Au', 0, -10);
    ctx!.font = `600 20px ${FONT}`; ctx!.fillText('GOLD · 999.9', 0, 47); ctx!.restore();
  }
  // Decorative orbits reuse the homepage motif; they do not imply a price trend.
  ctx.save(); ctx.translate(540, 670);
  [155, 204, 248].forEach((radius, i) => {
    ctx.strokeStyle = i === 1 ? palette.accent + '80' : palette.cardBorder;
    ctx.lineWidth = i === 1 ? 2 : 1; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();
  if (template === 'dual_metal') {
    bullion(458, 674); coin(690, 704, 98, true, 'Ag');
  } else if (template === 'studio_light') {
    const isSilver = /نقره/.test(payload.metrics[0]?.label ?? '');
    const isDollar = /دلار|درهم/.test(payload.metrics[0]?.label ?? '');
    if (isSilver || isDollar) coin(540, 670, 132, isSilver, isDollar ? '$' : 'Ag');
    else bullion(540, 670);
  } else {
    bullion(540, 670); coin(358, 775, 64, true, 'Ag'); coin(741, 575, 58, false, '$');
  }
  ctx.drawImage(logo, 928, 218, 80, 80);
  text(payload.brand, 904, 234, 700, 40, palette.accent, 1, 800);
  text(template === 'dual_metal' ? 'طلا یا نقره؟' : template === 'studio_light' || payload.metrics.length === 1 ? payload.title : 'یک نگاه، سه بازار.', 1008, 335, 936, 62, palette.text, 1, 800);
  text('قیمت را ببین. ارزش را مقایسه کن.', 1008, 424, 936, 29, palette.muted, 1);
  const metrics = payload.metrics;
  if (template === 'dual_metal') {
    const gold = metrics.find(item => /طلا/.test(item.label) && !/دلار|نسبت/.test(item.label));
    const silver = metrics.find(item => /^نقره/.test(item.label));
    [gold, silver].forEach((item, i) => metric(item ?? { label: i === 0 ? 'طلا' : 'نقره', value: '—', unit: '', tone: 'missing', meaning: 'در این گزارش موجود نیست' }, 72 + (1 - i) * 480, 958, 456, 318, true));
  } else if (template === 'studio_light') {
    if (metrics[0]) metric(metrics[0], 72, 958, 936, 318, true);
    else text('قیمت معتبر در دسترس نیست', 1008, 1000, 936, 48, palette.muted);
  } else {
    metrics.slice(0, 3).forEach((item, i) => metric(item, 72, 928 + i * 126, 936, 114));
    if (!metrics.length) text('قیمت معتبر در دسترس نیست', 1008, 1000, 936, 48, palette.muted);
  }
  text(payload.observedLabel, 1008, 864, 936, 22, palette.muted, 1);
  text(payload.takeaway, 1008, 1310, 936, 32, palette.text, 3);
  text(payload.disclaimer, 1008, 1478, 936, 23, palette.muted, 1);
  const qr = await QRCode.toDataURL(payload.url, { errorCorrectionLevel: 'M', margin: 4, width: 200, color: { dark: '#101010', light: '#ffffff' } });
  ctx.drawImage(await loadImage(qr), 72, 1530, 200, 200);
  text(payload.linkLabel, 1008, 1540, 670, 33, palette.accent, 2, 800);
  text(new URL(payload.url).hostname, 1008, 1630, 670, 26, palette.text, 1);
  if (payload.planBadge) text(payload.planBadge, 1008, 1680, 670, 22, palette.muted, 1);
  if (payload.testDataLabel) text(payload.testDataLabel, 1008, 1770, 936, 24, palette.accent, 1);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png_encode_failed');
  return blob;
}
