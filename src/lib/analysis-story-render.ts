/** Canvas renderer for 1080×1920 Instagram story PNGs (client-only).
 * Graphical layouts: logo top-center, metal art, metric, QR mid, clean margins.
 */

import QRCode from 'qrcode';
import {
  STORY_HEIGHT,
  STORY_WIDTH,
  type StoryPublicPayload,
  type StoryMetricTone,
  type StoryPublicMetric,
} from '@/lib/analysis-story-card';
import {
  storyPalette,
  type StoryPalette,
  type StoryTemplateId,
} from '@/lib/analysis-story-templates';

const FONT_URL = '/fonts/Vazirmatn.woff2';
const FONT_FAMILY = 'Vazirmatn';
const LOGO_URL = '/icons/app-192.png';
/** Instagram safe inset — keep content clear of UI chrome. */
const PAD = 88;

let fontReady: Promise<void> | null = null;

export async function ensureStoryFont(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (fontReady) return fontReady;
  fontReady = (async () => {
    try {
      const face = new FontFace(FONT_FAMILY, `url(${FONT_URL})`, { weight: '100 900', style: 'normal' });
      const loaded = await face.load();
      document.fonts.add(loaded);
      await document.fonts.ready;
    } catch { /* system font fallback */ }
  })();
  return fontReady;
}

function toneColor(tone: StoryMetricTone, template: StoryTemplateId) {
  if (tone === 'below') return template === 'studio_light' ? '#0e7490' : '#5eead4';
  if (tone === 'above') return template === 'studio_light' ? '#c2410c' : '#fb923c';
  if (tone === 'equal') return template === 'studio_light' ? '#334155' : '#cbd5e1';
  return template === 'studio_light' ? '#64748b' : '#94a3b8';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function pickMetrics(payload: StoryPublicPayload, template: StoryTemplateId): StoryPublicMetric[] {
  if (template !== 'dual_metal') return payload.metrics.slice(0, 3);
  const gold = payload.metrics.find(m => /طلا/.test(m.label));
  const silver = payload.metrics.find(m => /نقره/.test(m.label));
  const picked = [gold, silver].filter(Boolean) as StoryPublicMetric[];
  if (picked.length) return picked.slice(0, 2);
  return payload.metrics.slice(0, 2);
}

function fillStoryBackground(ctx: CanvasRenderingContext2D, palette: StoryPalette, template: StoryTemplateId) {
  const g = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  g.addColorStop(0, palette.bg);
  g.addColorStop(1, palette.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  if (template === 'pulse_neon') {
    const glow = ctx.createRadialGradient(STORY_WIDTH / 2, 420, 40, STORY_WIDTH / 2, 520, 640);
    glow.addColorStop(0, `${palette.metalA}28`);
    glow.addColorStop(0.55, `${palette.accent}12`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, STORY_WIDTH, 1100);
  } else if (template !== 'studio_light') {
    const glow = ctx.createRadialGradient(STORY_WIDTH / 2, 280, 30, STORY_WIDTH / 2, 380, 620);
    glow.addColorStop(0, `${palette.accent}24`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, STORY_WIDTH, 900);
  } else {
    // soft studio vignette
    const soft = ctx.createRadialGradient(STORY_WIDTH / 2, 360, 80, STORY_WIDTH / 2, 500, 900);
    soft.addColorStop(0, '#ffffffaa');
    soft.addColorStop(1, 'transparent');
    ctx.fillStyle = soft;
    ctx.fillRect(0, 0, STORY_WIDTH, 1000);
  }

  // faint ambient grid (graphical, not newspaper)
  ctx.save();
  ctx.strokeStyle = template === 'studio_light' ? '#00000008' : '#ffffff07';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = 220 + i * 170;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(STORY_WIDTH - PAD, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Stylized gold bullion stack — fills visual weight without stock photos. */
function drawGoldBars(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, a: string, b: string) {
  const w = 220 * scale;
  const h = 52 * scale;
  const gap = 18 * scale;
  for (let i = 0; i < 3; i++) {
    const y = cy - h + i * gap;
    const inset = i * 10 * scale;
    const x = cx - w / 2 + inset / 2;
    const barW = w - inset;
    const grad = ctx.createLinearGradient(x, y, x + barW, y + h);
    grad.addColorStop(0, b);
    grad.addColorStop(0.35, a);
    grad.addColorStop(0.7, '#fff3c4');
    grad.addColorStop(1, b);
    roundRect(ctx, x, y, barW, h, 10 * scale);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = `${b}cc`;
    ctx.lineWidth = 2;
    ctx.stroke();
    // face highlight
    ctx.fillStyle = '#ffffff33';
    roundRect(ctx, x + 12 * scale, y + 8 * scale, barW * 0.42, 8 * scale, 4);
    ctx.fill();
  }
}

function drawSilverBars(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, a: string, b: string) {
  const w = 200 * scale;
  const h = 48 * scale;
  const gap = 16 * scale;
  for (let i = 0; i < 3; i++) {
    const y = cy - h + i * gap;
    const inset = i * 8 * scale;
    const x = cx - w / 2 + inset / 2;
    const barW = w - inset;
    const grad = ctx.createLinearGradient(x, y, x + barW, y + h);
    grad.addColorStop(0, b);
    grad.addColorStop(0.4, a);
    grad.addColorStop(0.75, '#ffffff');
    grad.addColorStop(1, b);
    roundRect(ctx, x, y, barW, h, 9 * scale);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = `${b}aa`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a: string, b: string) {
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#fff6d0');
  grad.addColorStop(0.45, a);
  grad.addColorStop(1, b);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = b;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = `${b}99`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = `${b}dd`;
  ctx.font = `800 ${Math.round(r * 0.55)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Au', cx, cy + 2);
  ctx.textBaseline = 'alphabetic';
}

function drawSparkline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  seed: number,
) {
  const pts: { x: number; y: number }[] = [];
  const n = 18;
  let v = 0.55 + (seed % 7) * 0.02;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.7 + seed) * 0.08 + ((i * 17 + seed) % 5 - 2) * 0.015;
    v = Math.max(0.12, Math.min(0.88, v));
    pts.push({ x: x + (i / (n - 1)) * w, y: y + h - v * h });
  }
  // area
  ctx.beginPath();
  ctx.moveTo(pts[0].x, y + h);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts.at(-1)!.x, y + h);
  ctx.closePath();
  const area = ctx.createLinearGradient(0, y, 0, y + h);
  area.addColorStop(0, `${color}44`);
  area.addColorStop(1, `${color}00`);
  ctx.fillStyle = area;
  ctx.fill();
  // line
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawMetalScene(
  ctx: CanvasRenderingContext2D,
  template: StoryTemplateId,
  palette: StoryPalette,
  y: number,
  heroTone: StoryMetricTone,
) {
  const cx = STORY_WIDTH / 2;
  if (template === 'dual_metal') {
    drawGoldBars(ctx, cx - 210, y + 40, 0.85, palette.metalA, palette.metalB);
    drawSilverBars(ctx, cx + 210, y + 48, 0.85, palette.metalB, '#7a8899');
    return;
  }
  if (template === 'studio_light') {
    drawCoin(ctx, cx - 150, y + 70, 78, palette.metalA, palette.metalB);
    drawGoldBars(ctx, cx + 130, y + 50, 0.9, palette.metalA, palette.metalB);
    return;
  }
  if (template === 'pulse_neon') {
    drawSparkline(ctx, PAD + 40, y, STORY_WIDTH - PAD * 2 - 80, 150, toneColor(heroTone, template), 3);
    drawCoin(ctx, cx, y + 175, 54, palette.accent, palette.metalB);
    return;
  }
  // vault_dark
  drawGoldBars(ctx, cx, y + 30, 1.05, palette.metalA, palette.metalB);
  drawCoin(ctx, cx + 260, y + 110, 48, palette.metalA, palette.metalB);
}

export async function renderAnalysisStoryPng(
  payload: StoryPublicPayload,
  options?: { template?: StoryTemplateId; dark?: boolean },
): Promise<Blob> {
  await ensureStoryFont();
  const template: StoryTemplateId = options?.template
    ?? (options?.dark === false ? 'studio_light' : 'vault_dark');
  const palette = storyPalette(template);
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');

  const contentW = STORY_WIDTH - PAD * 2;
  const metrics = pickMetrics(payload, template);
  const hero = metrics[0];
  const rest = metrics.slice(1);

  fillStoryBackground(ctx, palette, template);

  // —— Logo top-center ——
  let y = PAD + 8;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  try {
    const logo = await loadImage(LOGO_URL);
    const logoSize = 64;
    ctx.drawImage(logo, STORY_WIDTH / 2 - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + 18;
  } catch {
    y += 8;
  }
  ctx.fillStyle = palette.accent;
  ctx.font = `800 40px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.brand, STORY_WIDTH / 2, y);
  y += 52;

  // Title — short, centered
  ctx.fillStyle = palette.text;
  ctx.font = `800 44px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.title, contentW - 40).slice(0, 2)) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 54;
  }
  y += 6;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 24px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.observedLabel, STORY_WIDTH / 2, y);
  y += 36;
  if (payload.planBadge) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.planBadge, STORY_WIDTH / 2, y);
    y += 30;
  }

  // —— Graphical metal scene ——
  drawMetalScene(ctx, template, palette, y, hero?.tone ?? 'missing');
  y += template === 'pulse_neon' ? 250 : 200;

  // —— Hero metric card ——
  const heroH = 220;
  ctx.fillStyle = palette.card;
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  roundRect(ctx, PAD, y, contentW, heroH, 28);
  ctx.fill();
  ctx.stroke();

  if (hero) {
    ctx.fillStyle = palette.muted;
    ctx.font = `700 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(hero.label, STORY_WIDTH / 2, y + 48);
    ctx.fillStyle = toneColor(hero.tone, template);
    ctx.font = `800 92px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(hero.value, STORY_WIDTH / 2, y + 138);
    ctx.fillStyle = palette.muted;
    ctx.font = `600 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(hero.meaning, STORY_WIDTH / 2, y + 186);
  }
  y += heroH + 28;

  // Takeaway — max 3 lines
  ctx.fillStyle = palette.text;
  ctx.font = `700 30px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.takeaway, contentW - 20).slice(0, 3)) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 42;
  }

  // Secondary metrics as compact chips (not newspaper rows)
  if (rest.length) {
    y += 18;
    const chipH = 86;
    const gap = 14;
    const chipW = (contentW - gap * (Math.min(rest.length, 2) - 1)) / Math.min(rest.length, 2);
    rest.slice(0, 2).forEach((metric, index) => {
      const x = PAD + index * (chipW + gap);
      ctx.fillStyle = palette.card;
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, chipW, chipH, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.font = `700 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, x + chipW / 2, y + 32);
      ctx.fillStyle = toneColor(metric.tone, template);
      ctx.font = `800 34px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, x + chipW / 2, y + 68);
    });
    y += chipH + 28;
  }

  // Disclaimer pill
  ctx.font = `700 24px ${FONT_FAMILY}, Tahoma, sans-serif`;
  const discLines = wrapText(ctx, payload.disclaimer, contentW - 48).slice(0, 1);
  const discW = Math.min(contentW, ctx.measureText(discLines[0] ?? payload.disclaimer).width + 64);
  ctx.fillStyle = `${palette.accent}22`;
  roundRect(ctx, STORY_WIDTH / 2 - discW / 2, y, discW, 56, 999);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.fillText(discLines[0] ?? payload.disclaimer, STORY_WIDTH / 2, y + 36);
  y += 80;

  // —— QR centered in mid/lower band ——
  const qrSize = 220;
  // Prefer true visual center of remaining space; clamp into safe zone
  const qrIdeal = Math.max(y + 20, Math.min(STORY_HEIGHT * 0.58, STORY_HEIGHT - PAD - qrSize - 160));
  const qrY = qrIdeal;
  const qrX = STORY_WIDTH / 2 - qrSize / 2;

  // soft plate behind QR
  ctx.fillStyle = palette.card;
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  roundRect(ctx, qrX - 28, qrY - 28, qrSize + 56, qrSize + 56, 24);
  ctx.fill();
  ctx.stroke();

  const qrDataUrl = await QRCode.toDataURL(payload.url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: qrSize,
    color: { dark: palette.qrDark, light: palette.qrLight },
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  let footY = qrY + qrSize + 48;
  ctx.fillStyle = palette.text;
  ctx.font = `800 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.linkLabel, STORY_WIDTH / 2, footY);
  footY += 40;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.url.replace(/^https?:\/\//, ''), STORY_WIDTH / 2, footY);

  if (payload.testDataLabel) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.testDataLabel, STORY_WIDTH / 2, STORY_HEIGHT - 36);
  }

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png_encode_failed');
  return blob;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_failed'));
    img.src = src;
  });
}
