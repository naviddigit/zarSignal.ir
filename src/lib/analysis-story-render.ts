/** Canvas renderer for 1080×1920 Instagram story PNGs (client-only).
 * Packed premium layout — no empty mid-band, typography-led, solid footer.
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
const PAD = 72;

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
  if (tone === 'below') return template === 'studio_light' ? '#0f766e' : '#2dd4bf';
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

function paintBackground(ctx: CanvasRenderingContext2D, palette: StoryPalette, template: StoryTemplateId) {
  const g = ctx.createLinearGradient(0, 0, STORY_WIDTH * 0.2, STORY_HEIGHT);
  g.addColorStop(0, palette.bg);
  g.addColorStop(1, palette.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // Soft brand glow — no grid lines (those looked newspaper-like)
  const glowY = template === 'pulse_neon' ? 520 : 380;
  const glow = ctx.createRadialGradient(STORY_WIDTH / 2, glowY, 20, STORY_WIDTH / 2, glowY, 520);
  glow.addColorStop(0, `${palette.accent}30`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, STORY_WIDTH, 1100);

  // Diagonal facet — abstract metal, not cartoon bars
  ctx.save();
  ctx.globalAlpha = template === 'studio_light' ? 0.07 : 0.12;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(STORY_WIDTH * 0.55, 0);
  ctx.lineTo(STORY_WIDTH, 0);
  ctx.lineTo(STORY_WIDTH, STORY_HEIGHT * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, STORY_HEIGHT * 0.55);
  ctx.lineTo(STORY_WIDTH * 0.35, STORY_HEIGHT);
  ctx.lineTo(0, STORY_HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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
  const n = 24;
  let v = 0.42;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.55 + seed) * 0.07 + (((i * 13 + seed * 3) % 5) - 2) * 0.012;
    v = Math.max(0.15, Math.min(0.85, v));
    pts.push({ x: x + (i / (n - 1)) * w, y: y + h - v * h });
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, y + h);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts.at(-1)!.x, y + h);
  ctx.closePath();
  const area = ctx.createLinearGradient(0, y, 0, y + h);
  area.addColorStop(0, `${color}55`);
  area.addColorStop(1, `${color}00`);
  ctx.fillStyle = area;
  ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  const last = pts.at(-1)!;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
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
  const accentTone = hero ? toneColor(hero.tone, template) : palette.accent;

  paintBackground(ctx, palette, template);
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.textBaseline = 'alphabetic';

  // —— Header (compact) ——
  let y = PAD;
  try {
    const logo = await loadImage(LOGO_URL);
    const logoSize = 52;
    ctx.drawImage(logo, STORY_WIDTH / 2 - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + 14;
  } catch {
    y += 4;
  }
  ctx.fillStyle = palette.accent;
  ctx.font = `800 34px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.brand, STORY_WIDTH / 2, y);
  y += 44;

  ctx.fillStyle = palette.text;
  ctx.font = `800 42px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.title, contentW).slice(0, 2)) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 50;
  }
  y += 4;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.observedLabel, STORY_WIDTH / 2, y);
  y += 28;
  if (payload.planBadge) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.planBadge, STORY_WIDTH / 2, y);
    y += 26;
  }

  // —— Hero panel (fills the visual focus; no cartoon metals) ——
  y += 12;
  const heroH = template === 'dual_metal' ? 460 : 520;
  roundRect(ctx, PAD, y, contentW, heroH, 32);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner accent wash
  const wash = ctx.createLinearGradient(PAD, y, PAD + contentW, y + heroH);
  wash.addColorStop(0, `${accentTone}18`);
  wash.addColorStop(1, 'transparent');
  ctx.fillStyle = wash;
  roundRect(ctx, PAD, y, contentW, heroH, 32);
  ctx.fill();

  if (template === 'dual_metal' && rest[0]) {
    const half = (contentW - 20) / 2;
    const pair: StoryPublicMetric[] = [metrics[0], metrics[1] ?? rest[0]].filter(Boolean) as StoryPublicMetric[];
    pair.slice(0, 2).forEach((metric, i) => {
      const x = PAD + 16 + i * (half + 20);
      const tone = toneColor(metric.tone, template);
      roundRect(ctx, x, y + 24, half, heroH - 48, 24);
      ctx.fillStyle = i === 0 ? `${palette.metalA}14` : `${palette.metalB}14`;
      ctx.fill();
      ctx.fillStyle = palette.muted;
      ctx.font = `700 24px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, x + half / 2, y + 70);
      ctx.fillStyle = tone;
      ctx.font = `800 64px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, x + half / 2, y + 160);
      ctx.fillStyle = palette.muted;
      ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.meaning, x + half / 2, y + 210);
      drawSparkline(ctx, x + 28, y + 250, half - 56, 120, tone, i + 2);
    });
  } else if (hero) {
    ctx.fillStyle = palette.muted;
    ctx.font = `700 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(hero.label, STORY_WIDTH / 2, y + 64);

    ctx.fillStyle = accentTone;
    ctx.font = `800 128px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(hero.value, STORY_WIDTH / 2, y + 210);

    ctx.fillStyle = palette.text;
    ctx.font = `700 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(hero.meaning, STORY_WIDTH / 2, y + 270);

    drawSparkline(ctx, PAD + 48, y + 320, contentW - 96, 150, accentTone, template === 'pulse_neon' ? 9 : 4);
  }
  y += heroH + 28;

  // —— Takeaway ——
  ctx.fillStyle = palette.text;
  ctx.font = `700 30px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.takeaway, contentW - 8).slice(0, 3)) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 40;
  }
  y += 8;

  // —— Secondary chips (skip for dual — already shown) ——
  if (template !== 'dual_metal' && rest.length) {
    const gap = 12;
    const n = Math.min(2, rest.length);
    const chipW = (contentW - gap * (n - 1)) / n;
    const chipH = 96;
    rest.slice(0, n).forEach((metric, i) => {
      const x = PAD + i * (chipW + gap);
      roundRect(ctx, x, y, chipW, chipH, 18);
      ctx.fillStyle = palette.card;
      ctx.fill();
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.font = `700 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, x + chipW / 2, y + 34);
      ctx.fillStyle = toneColor(metric.tone, template);
      ctx.font = `800 34px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, x + chipW / 2, y + 74);
    });
    y += chipH + 22;
  }

  // Disclaimer
  ctx.font = `700 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
  const disc = wrapText(ctx, payload.disclaimer, contentW - 40).slice(0, 1)[0] ?? payload.disclaimer;
  const discW = Math.min(contentW, ctx.measureText(disc).width + 56);
  roundRect(ctx, STORY_WIDTH / 2 - discW / 2, y, discW, 52, 999);
  ctx.fillStyle = `${palette.accent}1f`;
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.fillText(disc, STORY_WIDTH / 2, y + 34);
  y += 68;

  // —— Solid footer block fills remaining height (kills empty mid-gap) ——
  const footerTop = Math.max(y + 8, STORY_HEIGHT - 520);
  roundRect(ctx, PAD - 8, footerTop, contentW + 16, STORY_HEIGHT - footerTop - PAD + 8, 28);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  const qrSize = 200;
  const qrX = STORY_WIDTH / 2 - qrSize / 2;
  const footerInner = STORY_HEIGHT - footerTop - PAD;
  const qrY = footerTop + Math.max(36, (footerInner - qrSize - 120) / 2);

  const qrDataUrl = await QRCode.toDataURL(payload.url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: qrSize,
    color: { dark: palette.qrDark, light: palette.qrLight },
  });
  const qrImg = await loadImage(qrDataUrl);
  // White/plate behind QR for scan reliability
  roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 18);
  ctx.fillStyle = template === 'studio_light' ? '#ffffff' : palette.bg;
  ctx.fill();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  let footY = qrY + qrSize + 40;
  ctx.fillStyle = palette.text;
  ctx.font = `800 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.linkLabel, STORY_WIDTH / 2, footY);
  footY += 36;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.url.replace(/^https?:\/\//, ''), STORY_WIDTH / 2, footY);

  if (payload.testDataLabel) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 18px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.testDataLabel, STORY_WIDTH / 2, STORY_HEIGHT - 28);
  }

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png_encode_failed');
  return blob;
}
