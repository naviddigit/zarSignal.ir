/** Canvas renderer for 1080×1920 analysis story PNGs (client-only). */

import QRCode from 'qrcode';
import {
  STORY_HEIGHT,
  STORY_WIDTH,
  type StoryPublicPayload,
  type StoryMetricTone,
} from '@/lib/analysis-story-card';

const FONT_URL = '/fonts/Vazirmatn.woff2';
const FONT_FAMILY = 'Vazirmatn';

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
      // Fall back to system fonts already used by the site.
    }
  })();
  return fontReady;
}

function toneColor(tone: StoryMetricTone, dark: boolean) {
  if (tone === 'below') return dark ? '#4dd8e7' : '#0e7490';
  if (tone === 'above') return dark ? '#f0a35a' : '#c2410c';
  if (tone === 'equal') return dark ? '#bdc8d8' : '#334155';
  return dark ? '#8795a8' : '#64748b';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

export async function renderAnalysisStoryPng(
  payload: StoryPublicPayload,
  options?: { dark?: boolean },
): Promise<Blob> {
  await ensureStoryFont();
  const dark = options?.dark ?? true;
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');

  // Safe margins ≈ 80px (Instagram-safe zone)
  const pad = 80;
  const contentW = STORY_WIDTH - pad * 2;

  ctx.fillStyle = dark ? '#080c13' : '#f5f7fa';
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // Soft brand glow (not the watermark blur layer)
  const glow = ctx.createRadialGradient(STORY_WIDTH * 0.7, 120, 40, STORY_WIDTH * 0.7, 200, 520);
  glow.addColorStop(0, dark ? '#f0c56822' : '#b4530914');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, STORY_WIDTH, 700);

  ctx.textAlign = 'right';
  ctx.direction = 'rtl';

  let y = pad + 20;
  ctx.fillStyle = dark ? '#f0c568' : '#b45309';
  ctx.font = `800 42px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.brand, STORY_WIDTH - pad, y);

  y += 70;
  ctx.fillStyle = dark ? '#f4f7fb' : '#0f172a';
  ctx.font = `800 54px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.title, contentW).slice(0, 3)) {
    ctx.fillText(line, STORY_WIDTH - pad, y);
    y += 68;
  }

  y += 18;
  ctx.fillStyle = dark ? '#8795a8' : '#64748b';
  ctx.font = `600 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.observedLabel, STORY_WIDTH - pad, y);

  if (payload.planBadge) {
    y += 48;
    ctx.fillStyle = dark ? '#f0c568' : '#b45309';
    ctx.font = `700 26px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.planBadge, STORY_WIDTH - pad, y);
  }

  y += 70;
  ctx.fillStyle = dark ? '#bdc8d8' : '#334155';
  ctx.font = `700 34px ${FONT_FAMILY}, Tahoma, sans-serif`;
  for (const line of wrapText(ctx, payload.takeaway, contentW).slice(0, 5)) {
    ctx.fillText(line, STORY_WIDTH - pad, y);
    y += 48;
  }

  y += 36;
  for (const metric of payload.metrics) {
    const boxH = 118;
    ctx.fillStyle = dark ? '#101722' : '#ffffff';
    ctx.strokeStyle = dark ? '#263345' : '#d8e0ea';
    ctx.lineWidth = 2;
    roundRect(ctx, pad, y, contentW, boxH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = dark ? '#bdc8d8' : '#334155';
    ctx.font = `700 28px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(metric.label, STORY_WIDTH - pad - 28, y + 42);

    ctx.fillStyle = toneColor(metric.tone, dark);
    ctx.font = `800 40px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(metric.value, STORY_WIDTH - pad - 28, y + 92);

    ctx.fillStyle = dark ? '#8795a8' : '#64748b';
    ctx.font = `600 24px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${metric.meaning} · ${metric.unit}`, pad + 28, y + 70);
    ctx.textAlign = 'right';
    y += boxH + 18;
  }

  y = Math.max(y + 24, STORY_HEIGHT - 520);
  ctx.fillStyle = dark ? '#f0c568' : '#b45309';
  ctx.font = `800 32px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.disclaimer, STORY_WIDTH - pad, y);

  // QR + link in safe bottom zone
  const qrSize = 220;
  const qrX = pad;
  const qrY = STORY_HEIGHT - pad - qrSize - 40;
  const qrDataUrl = await QRCode.toDataURL(payload.url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: qrSize,
    color: { dark: dark ? '#f4f7fb' : '#0f172a', light: dark ? '#080c13' : '#f5f7fa' },
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = dark ? '#f4f7fb' : '#0f172a';
  ctx.font = `800 30px ${FONT_FAMILY}, Tahoma, sans-serif`;
  ctx.fillText(payload.linkLabel, STORY_WIDTH - pad, qrY + 70);
  ctx.fillStyle = dark ? '#8795a8' : '#64748b';
  ctx.font = `600 24px ${FONT_FAMILY}, Tahoma, sans-serif`;
  const urlLines = wrapText(ctx, payload.url.replace(/^https?:\/\//, ''), contentW - qrSize - 40).slice(0, 3);
  let uy = qrY + 120;
  for (const line of urlLines) {
    ctx.fillText(line, STORY_WIDTH - pad, uy);
    uy += 34;
  }

  if (payload.testDataLabel) {
    ctx.fillStyle = dark ? '#e8c547' : '#a16207';
    ctx.font = `700 22px ${FONT_FAMILY}, Tahoma, sans-serif`;
    ctx.fillText(payload.testDataLabel, STORY_WIDTH - pad, STORY_HEIGHT - pad + 8);
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
    img.onerror = () => reject(new Error('qr_image_failed'));
    img.src = src;
  });
}
