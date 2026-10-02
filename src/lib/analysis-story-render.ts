/** Canvas renderer for 1080×1920 analysis story PNGs (client-only). */

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
    } catch {
      /* system font fallback */
    }
  })();
  return fontReady;
}

function toneColor(tone: StoryMetricTone, template: StoryTemplateId) {
  if (tone === 'below') return template === 'minimal_light' ? '#0e7490' : '#4dd8e7';
  if (tone === 'above') return template === 'minimal_light' ? '#c2410c' : '#f0a35a';
  if (tone === 'equal') return template === 'minimal_light' ? '#334155' : '#bdc8d8';
  return template === 'minimal_light' ? '#64748b' : '#8795a8';
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

  const pad = 80;
  const contentW = STORY_WIDTH - pad * 2;
  const metrics = pickMetrics(payload, template);

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  if (template !== 'minimal_light') {
    const glow = ctx.createRadialGradient(STORY_WIDTH * 0.72, 160, 40, STORY_WIDTH * 0.72, 240, 560);
    glow.addColorStop(0, '#f0c56828');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, STORY_WIDTH, 760);
  }

  ctx.textAlign = 'right';
  ctx.direction = 'rtl';

  let y = pad;
  // Real logo mark + brand
  try {
    const logo = await loadImage(LOGO_URL);
    const logoSize = 72;
    ctx.drawImage(logo, STORY_WIDTH - pad - logoSize, y, logoSize, logoSize);
    ctx.fillStyle = palette.accent;
    ctx.font = `800 40px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.brand, STORY_WIDTH - pad - logoSize - 18, y + 50);
    y += logoSize + 36;
  } catch {
    ctx.fillStyle = palette.accent;
    ctx.font = `800 42px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.brand, STORY_WIDTH - pad, y + 40);
    y += 70;
  }

  ctx.fillStyle = palette.text;
  ctx.font = `800 52px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.title, contentW).slice(0, 3)) {
    ctx.fillText(line, STORY_WIDTH - pad, y);
    y += 64;
  }

  y += 12;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.observedLabel, STORY_WIDTH - pad, y);

  if (payload.planBadge) {
    y += 44;
    ctx.fillStyle = palette.accent;
    ctx.font = `700 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.planBadge, STORY_WIDTH - pad, y);
  }

  y += 56;
  ctx.fillStyle = palette.text;
  ctx.font = `700 34px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.takeaway, contentW).slice(0, 5)) {
    ctx.fillText(line, STORY_WIDTH - pad, y);
    y += 46;
  }

  y += 28;
  if (template === 'gold_silver' && metrics.length >= 2) {
    const gap = 20;
    const boxW = (contentW - gap) / 2;
    const boxH = 220;
    metrics.slice(0, 2).forEach((metric, index) => {
      const x = index === 0 ? pad + boxW + gap : pad;
      ctx.fillStyle = palette.card;
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, boxW, boxH, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.font = `700 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, x + boxW - 22, y + 48);
      ctx.fillStyle = toneColor(metric.tone, template);
      ctx.font = `800 44px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, x + boxW - 22, y + 118);
      ctx.fillStyle = palette.muted;
      ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
      const meaningLines = wrapText(ctx, metric.meaning, boxW - 40).slice(0, 2);
      let my = y + 160;
      for (const line of meaningLines) {
        ctx.fillText(line, x + boxW - 22, my);
        my += 28;
      }
    });
    y += boxH + 28;
  } else {
    for (const metric of metrics) {
      const boxH = template === 'minimal_light' ? 108 : 112;
      ctx.fillStyle = palette.card;
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      roundRect(ctx, pad, y, contentW, boxH, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.text;
      ctx.font = `700 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.label, STORY_WIDTH - pad - 28, y + 40);
      ctx.fillStyle = toneColor(metric.tone, template);
      ctx.font = `800 38px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.fillText(metric.value, STORY_WIDTH - pad - 28, y + 88);
      ctx.fillStyle = palette.muted;
      ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${metric.meaning}`, pad + 28, y + 68);
      ctx.textAlign = 'right';
      y += boxH + 16;
    }
  }

  // Pack disclaimer just below metrics — no forced empty mid-band.
  y += 20;
  ctx.fillStyle = palette.accent;
  ctx.font = `800 30px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.disclaimer, contentW).slice(0, 2)) {
    ctx.fillText(line, STORY_WIDTH - pad, y);
    y += 40;
  }

  // QR + CTA in bottom safe zone
  const qrSize = 200;
  const qrX = pad;
  const qrY = Math.min(Math.max(y + 48, STORY_HEIGHT - pad - qrSize - 56), STORY_HEIGHT - pad - qrSize - 40);
  const qrDataUrl = await QRCode.toDataURL(payload.url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: qrSize,
    color: { dark: palette.qrDark, light: palette.qrLight },
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = palette.text;
  ctx.font = `800 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.linkLabel, STORY_WIDTH - pad, qrY + 56);
  ctx.fillStyle = palette.muted;
  ctx.font = `600 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
  let uy = qrY + 100;
  for (const line of wrapText(ctx, payload.url.replace(/^https?:\/\//, ''), contentW - qrSize - 36).slice(0, 3)) {
    ctx.fillText(line, STORY_WIDTH - pad, uy);
    uy += 30;
  }

  if (payload.testDataLabel) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.testDataLabel, STORY_WIDTH - pad, STORY_HEIGHT - 36);
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
