/** Canvas renderer for 1080×1920 analysis story PNGs (client-only).
 * Balanced vertical composition — no empty mid-band, clear hierarchy.
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
  type StoryTemplateId,
} from '@/lib/analysis-story-templates';

const FONT_URL = '/fonts/Vazirmatn.woff2';
const FONT_FAMILY = 'Vazirmatn';
const LOGO_URL = '/icons/app-192.png';

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
  if (tone === 'below') return template === 'minimal_light' ? '#0e7490' : '#5eead4';
  if (tone === 'above') return template === 'minimal_light' ? '#c2410c' : '#fb923c';
  if (tone === 'equal') return template === 'minimal_light' ? '#334155' : '#cbd5e1';
  return template === 'minimal_light' ? '#64748b' : '#94a3b8';
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
  if (template !== 'gold_silver') return payload.metrics.slice(0, 3);
  const gold = payload.metrics.find(m => /طلا/.test(m.label));
  const silver = payload.metrics.find(m => /نقره/.test(m.label));
  const picked = [gold, silver].filter(Boolean) as StoryPublicMetric[];
  if (picked.length) return picked.slice(0, 2);
  return payload.metrics.slice(0, 2);
}

export async function renderAnalysisStoryPng(
  payload: StoryPublicPayload,
  options?: { template?: StoryTemplateId; dark?: boolean },
): Promise<Blob> {
  await ensureStoryFont();
  const template: StoryTemplateId = options?.template
    ?? (options?.dark === false ? 'minimal_light' : 'dark_gold');
  const palette = storyPalette(template);
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');

  const pad = 72;
  const contentW = STORY_WIDTH - pad * 2;
  const metrics = pickMetrics(payload, template);
  const hero = metrics[0];
  const rest = metrics.slice(1);

  // Background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  if (template !== 'minimal_light') {
    const glow = ctx.createRadialGradient(STORY_WIDTH * 0.5, 220, 20, STORY_WIDTH * 0.5, 320, 700);
    glow.addColorStop(0, `${palette.accent}22`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, STORY_WIDTH, 900);
  }

  ctx.textAlign = 'right';
  ctx.direction = 'rtl';

  // —— Header brand strip ——
  let y = pad;
  try {
    const logo = await loadImage(LOGO_URL);
    const logoSize = 56;
    ctx.drawImage(logo, STORY_WIDTH - pad - logoSize, y, logoSize, logoSize);
    ctx.fillStyle = palette.accent;
    ctx.font = `800 34px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.brand, STORY_WIDTH - pad - logoSize - 16, y + 38);
    y += logoSize + 28;
  } catch {
    ctx.fillStyle = palette.accent;
    ctx.font = `800 36px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.brand, STORY_WIDTH - pad, y + 36);
    y += 56;
  }

  // Rule under brand
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(STORY_WIDTH - pad, y);
  ctx.stroke();
  y += 40;

  // Title
  ctx.fillStyle = palette.text;
  ctx.font = `800 48px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.title, contentW).slice(0, 2)) {
    ctx.fillText(line, STORY_WIDTH - pad, y);
    y += 58;
  }

  y += 8;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.observedLabel, STORY_WIDTH - pad, y);
  if (payload.planBadge) {
    y += 40;
    ctx.fillStyle = palette.accent;
    ctx.font = `700 24px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.planBadge, STORY_WIDTH - pad, y);
  }

  // —— Hero metric card (fills visual center) ——
  y += 48;
  const heroH = 280;
  ctx.fillStyle = palette.card;
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  roundRect(ctx, pad, y, contentW, heroH, 28);
  ctx.fill();
  ctx.stroke();

  if (hero) {
    ctx.fillStyle = palette.muted;
    ctx.font = `700 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(hero.label, STORY_WIDTH - pad - 36, y + 56);
    ctx.fillStyle = toneColor(hero.tone, template);
    ctx.font = `800 96px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(hero.value, STORY_WIDTH - pad - 36, y + 160);
    ctx.fillStyle = palette.text;
    ctx.font = `600 30px ${FONT_FAMILY}, Tahoma, sans-serif`;
    for (const line of wrapText(ctx, hero.meaning, contentW - 72).slice(0, 2)) {
      ctx.fillText(line, STORY_WIDTH - pad - 36, y + 220);
      y += 0; // keep base; lines drawn relative
    }
    // redraw meaning with local cursor
    let my = y + 210;
    ctx.fillStyle = palette.muted;
    ctx.font = `600 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
    for (const line of wrapText(ctx, hero.meaning, contentW - 72).slice(0, 2)) {
      ctx.fillText(line, STORY_WIDTH - pad - 36, my);
      my += 36;
    }
  }
  y += heroH + 36;

  // Takeaway
  ctx.fillStyle = palette.text;
  ctx.font = `700 32px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.takeaway, contentW).slice(0, 4)) {
    ctx.fillText(line, STORY_WIDTH - pad, y);
    y += 44;
  }

  // Secondary metrics as compact rows (fills mid space)
  y += 28;
  if (template === 'gold_silver' && rest.length >= 1) {
    const gap = 18;
    const pair = rest.slice(0, 2);
    const pairW = (contentW - gap) / Math.max(1, pair.length);
    const boxH = 160;
    pair.forEach((metric, index) => {
      const x = pad + (pair.length - 1 - index) * (pairW + gap);
      ctx.fillStyle = palette.card;
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, pairW, boxH, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.font = `700 24px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, x + pairW - 20, y + 44);
      ctx.fillStyle = toneColor(metric.tone, template);
      ctx.font = `800 40px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, x + pairW - 20, y + 100);
      ctx.fillStyle = palette.muted;
      ctx.font = `600 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.meaning, x + pairW - 20, y + 136);
    });
    y += boxH + 28;
  } else {
    for (const metric of rest) {
      const boxH = 100;
      ctx.fillStyle = palette.card;
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      roundRect(ctx, pad, y, contentW, boxH, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.text;
      ctx.font = `700 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, STORY_WIDTH - pad - 28, y + 40);
      ctx.fillStyle = toneColor(metric.tone, template);
      ctx.font = `800 36px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, STORY_WIDTH - pad - 28, y + 82);
      ctx.fillStyle = palette.muted;
      ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(metric.meaning, pad + 28, y + 64);
      ctx.textAlign = 'right';
      y += boxH + 14;
    }
  }

  // Disclaimer band
  y += 12;
  ctx.fillStyle = `${palette.accent}18`;
  roundRect(ctx, pad, y, contentW, 72, 16);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.font = `700 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
  let dy = y + 46;
  for (const line of wrapText(ctx, payload.disclaimer, contentW - 40).slice(0, 1)) {
    ctx.fillText(line, STORY_WIDTH - pad - 24, dy);
  }
  y += 96;

  // —— Footer: QR + CTA pinned to bottom ——
  const qrSize = 188;
  const footerY = STORY_HEIGHT - pad - qrSize;
  // Fill remaining gap with a subtle divider if content ended early
  if (y < footerY - 40) {
    ctx.strokeStyle = palette.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, footerY - 36);
    ctx.lineTo(STORY_WIDTH - pad, footerY - 36);
    ctx.stroke();
  }

  const qrDataUrl = await QRCode.toDataURL(payload.url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: qrSize,
    color: { dark: palette.qrDark, light: palette.qrLight },
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, pad, footerY, qrSize, qrSize);

  ctx.fillStyle = palette.text;
  ctx.font = `800 30px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.linkLabel, STORY_WIDTH - pad, footerY + 52);
  ctx.fillStyle = palette.muted;
  ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
  let uy = footerY + 96;
  for (const line of wrapText(ctx, payload.url.replace(/^https?:\/\//, ''), contentW - qrSize - 40).slice(0, 3)) {
    ctx.fillText(line, STORY_WIDTH - pad, uy);
    uy += 30;
  }

  if (payload.testDataLabel) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 20px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.testDataLabel, STORY_WIDTH - pad, STORY_HEIGHT - 28);
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
