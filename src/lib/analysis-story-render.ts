/** Canvas renderer for 1080×1920 Instagram story PNGs (client-only).
 * Four distinct premium layouts. Fixed vertical bands — QR in true middle.
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
const PAD = 64;
const CX = STORY_WIDTH / 2;

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

function paintAtmosphere(ctx: CanvasRenderingContext2D, palette: StoryPalette, template: StoryTemplateId) {
  const g = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  g.addColorStop(0, palette.bg);
  g.addColorStop(0.45, palette.bg2);
  g.addColorStop(1, palette.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // Soft brand orb behind header
  const orb = ctx.createRadialGradient(CX, 280, 40, CX, 320, 480);
  orb.addColorStop(0, `${palette.accent}${template === 'studio_light' ? '28' : '33'}`);
  orb.addColorStop(1, 'transparent');
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, STORY_WIDTH, 900);

  // Abstract gold facet — graphical, not cartoon icons
  ctx.save();
  ctx.globalAlpha = template === 'studio_light' ? 0.09 : 0.16;
  const metal = ctx.createLinearGradient(STORY_WIDTH * 0.6, 0, STORY_WIDTH, 700);
  metal.addColorStop(0, palette.metalA);
  metal.addColorStop(1, palette.metalB);
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(STORY_WIDTH * 0.62, -40);
  ctx.lineTo(STORY_WIDTH + 40, 120);
  ctx.lineTo(STORY_WIDTH + 40, 760);
  ctx.lineTo(STORY_WIDTH * 0.78, 520);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-40, STORY_HEIGHT * 0.62);
  ctx.lineTo(STORY_WIDTH * 0.38, STORY_HEIGHT + 40);
  ctx.lineTo(-40, STORY_HEIGHT + 40);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (template === 'pulse_neon') {
    const neon = ctx.createRadialGradient(CX, 900, 30, CX, 980, 420);
    neon.addColorStop(0, `${palette.metalA}40`);
    neon.addColorStop(1, 'transparent');
    ctx.fillStyle = neon;
    ctx.fillRect(0, 700, STORY_WIDTH, 700);
  }
}

/** Concentric metal ring behind hero number. */
function drawMetalRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a: string, b: string) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const rr = r - i * 18;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, Math.PI * 0.15, Math.PI * 1.75);
    const stroke = ctx.createLinearGradient(cx - rr, cy, cx + rr, cy);
    stroke.addColorStop(0, b);
    stroke.addColorStop(0.5, a);
    stroke.addColorStop(1, b);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = i === 0 ? 5 : 2;
    ctx.globalAlpha = 0.55 - i * 0.12;
    ctx.stroke();
  }
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
  const n = 28;
  let v = 0.55;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.48 + seed) * 0.06 + (((i * 11 + seed * 5) % 5) - 2) * 0.01;
    v = Math.max(0.18, Math.min(0.82, v));
    pts.push({ x: x + (i / (n - 1)) * w, y: y + h - v * h });
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, y + h);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts.at(-1)!.x, y + h);
  ctx.closePath();
  const area = ctx.createLinearGradient(0, y, 0, y + h);
  area.addColorStop(0, `${color}66`);
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
  ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(last.x, last.y, 14, 0, Math.PI * 2);
  ctx.strokeStyle = `${color}77`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

async function drawBrandHeader(
  ctx: CanvasRenderingContext2D,
  payload: StoryPublicPayload,
  palette: StoryPalette,
  contentW: number,
): Promise<number> {
  let y = PAD + 8;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  try {
    const logo = await loadImage(LOGO_URL);
    const logoSize = 56;
    // Soft plate under logo
    roundRect(ctx, CX - 40, y - 8, 80, 80, 20);
    ctx.fillStyle = `${palette.accent}18`;
    ctx.fill();
    ctx.drawImage(logo, CX - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + 18;
  } catch {
    y += 8;
  }
  ctx.fillStyle = palette.accent;
  ctx.font = `800 36px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.brand, CX, y);
  y += 48;

  ctx.fillStyle = palette.text;
  ctx.font = `800 44px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.title, contentW).slice(0, 2)) {
    ctx.fillText(line, CX, y);
    y += 52;
  }
  y += 6;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.observedLabel, CX, y);
  y += 30;
  if (payload.planBadge) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.planBadge, CX, y);
    y += 26;
  }
  return y + 10;
}

function drawHeroPanel(
  ctx: CanvasRenderingContext2D,
  y: number,
  contentW: number,
  heroH: number,
  template: StoryTemplateId,
  palette: StoryPalette,
  metrics: StoryPublicMetric[],
) {
  const hero = metrics[0];
  const accent = hero ? toneColor(hero.tone, template) : palette.accent;

  roundRect(ctx, PAD, y, contentW, heroH, 28);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner wash
  const wash = ctx.createLinearGradient(PAD, y, PAD + contentW, y + heroH);
  wash.addColorStop(0, `${accent}22`);
  wash.addColorStop(0.55, 'transparent');
  wash.addColorStop(1, `${palette.accent}10`);
  roundRect(ctx, PAD, y, contentW, heroH, 28);
  ctx.fillStyle = wash;
  ctx.fill();

  if (template === 'dual_metal' && metrics.length >= 2) {
    const half = (contentW - 24) / 2;
    metrics.slice(0, 2).forEach((metric, i) => {
      const x = PAD + 12 + i * (half + 12);
      const tone = toneColor(metric.tone, template);
      roundRect(ctx, x, y + 18, half, heroH - 36, 20);
      ctx.fillStyle = i === 0 ? `${palette.metalA}16` : `${palette.metalB}14`;
      ctx.fill();
      ctx.fillStyle = palette.muted;
      ctx.font = `700 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, x + half / 2, y + 58);
      ctx.fillStyle = tone;
      ctx.font = `800 58px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, x + half / 2, y + 130);
      ctx.fillStyle = palette.muted;
      ctx.font = `600 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.meaning, x + half / 2, y + 172);
      drawSparkline(ctx, x + 22, y + 200, half - 44, 100, tone, i + 3);
    });
    return;
  }

  if (!hero) return;

  if (template === 'vault_dark' || template === 'studio_light') {
    drawMetalRing(ctx, CX, y + heroH * 0.42, 150, palette.metalA, palette.metalB);
  }

  ctx.fillStyle = palette.muted;
  ctx.font = `700 24px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(hero.label, CX, y + 52);

  ctx.fillStyle = accent;
  ctx.font = `800 ${template === 'pulse_neon' ? 110 : 118}px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(hero.value, CX, y + 168);

  ctx.fillStyle = palette.text;
  ctx.font = `700 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(hero.meaning, CX, y + 218);

  drawSparkline(
    ctx,
    PAD + 40,
    y + 250,
    contentW - 80,
    template === 'pulse_neon' ? 150 : 120,
    accent,
    template === 'pulse_neon' ? 11 : 5,
  );
}

async function drawQrBand(
  ctx: CanvasRenderingContext2D,
  y: number,
  h: number,
  contentW: number,
  payload: StoryPublicPayload,
  palette: StoryPalette,
  template: StoryTemplateId,
) {
  roundRect(ctx, PAD, y, contentW, h, 28);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  const qrSize = 196;
  const qrX = CX - qrSize / 2;
  const qrY = y + 28;

  // Scan plate
  roundRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 16);
  ctx.fillStyle = template === 'studio_light' ? '#ffffff' : palette.bg;
  ctx.fill();

  const qrDataUrl = await QRCode.toDataURL(payload.url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: qrSize,
    color: { dark: palette.qrDark, light: palette.qrLight },
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  let ty = qrY + qrSize + 36;
  ctx.fillStyle = palette.text;
  ctx.font = `800 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.linkLabel, CX, ty);
  ty += 34;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.url.replace(/^https?:\/\//, ''), CX, ty);
}

function drawBottomBand(
  ctx: CanvasRenderingContext2D,
  y: number,
  contentW: number,
  payload: StoryPublicPayload,
  rest: StoryPublicMetric[],
  template: StoryTemplateId,
  palette: StoryPalette,
) {
  const bottom = STORY_HEIGHT - PAD;
  const panelH = Math.max(220, bottom - y);
  roundRect(ctx, PAD, y, contentW, panelH, 28);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  let ty = y + 40;
  ctx.fillStyle = palette.text;
  ctx.font = `700 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.takeaway, contentW - 40).slice(0, 3)) {
    ctx.fillText(line, CX, ty);
    ty += 38;
  }
  ty += 18;

  if (template !== 'dual_metal' && rest.length) {
    const gap = 12;
    const n = Math.min(2, rest.length);
    const chipW = (contentW - 40 - gap * (n - 1)) / n;
    const chipH = 96;
    rest.slice(0, n).forEach((metric, i) => {
      const x = PAD + 20 + i * (chipW + gap);
      roundRect(ctx, x, ty, chipW, chipH, 18);
      ctx.fillStyle = `${palette.accent}10`;
      ctx.fill();
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.font = `700 18px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, x + chipW / 2, ty + 34);
      ctx.fillStyle = toneColor(metric.tone, template);
      ctx.font = `800 34px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, x + chipW / 2, ty + 74);
    });
    ty += chipH + 24;
  }

  ctx.font = `700 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
  const disc = wrapText(ctx, payload.disclaimer, contentW - 64).slice(0, 1)[0] ?? payload.disclaimer;
  const discW = Math.min(contentW - 40, ctx.measureText(disc).width + 56);
  const discY = Math.min(ty, bottom - 70);
  roundRect(ctx, CX - discW / 2, discY, discW, 50, 999);
  ctx.fillStyle = `${palette.accent}24`;
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.fillText(disc, CX, discY + 32);
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
  const rest = template === 'dual_metal' ? [] : metrics.slice(1);

  paintAtmosphere(ctx, palette, template);
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.textBaseline = 'alphabetic';

  // Fixed bands so middle never collapses into empty void:
  // header ~ top, hero, QR mid, bottom stack.
  const headerEnd = await drawBrandHeader(ctx, payload, palette, contentW);
  const heroH = template === 'dual_metal' ? 360 : 400;
  const heroY = Math.max(headerEnd, 250);
  drawHeroPanel(ctx, heroY, contentW, heroH, template, palette, metrics);

  const qrH = 320;
  const qrY = heroY + heroH + 28;
  await drawQrBand(ctx, qrY, qrH, contentW, payload, palette, template);

  const bottomY = qrY + qrH + 36;
  drawBottomBand(ctx, bottomY, contentW, payload, rest, template, palette);

  if (payload.testDataLabel) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 18px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.testDataLabel, CX, STORY_HEIGHT - 28);
  }

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('png_encode_failed');
  return blob;
}
