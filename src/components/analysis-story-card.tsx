'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageDown, Share2, Download, Sparkles } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import type { MarketViewReport } from '@/lib/market-view-report';
import {
  assertStoryPayloadPublic,
  buildStoryPublicPayload,
} from '@/lib/analysis-story-card';
import { renderAnalysisStoryPng } from '@/lib/analysis-story-render';
import {
  STORY_TEMPLATES,
  STORY_TEMPLATE_LABELS,
  type StoryTemplateId,
} from '@/lib/analysis-story-templates';
import type { AccessLevel } from '@/lib/capabilities';
import type { Snapshot } from '@/lib/market';
import { parseStoryBackgrounds, type StoryBackground } from '@/lib/story-backgrounds';

export function AnalysisStoryCardButton({
  report,
  planLevel = null,
  planLabel = null,
  planStatus = null,
  showPlanBadge = false,
  testDataLabel = null,
  compact = false,
}: {
  report: MarketViewReport;
  planLevel?: AccessLevel | null;
  planLabel?: string | null;
  planStatus?: 'فعال' | 'آزمایشی' | 'رایگان' | 'در انتظار پرداخت' | 'تعلیق‌شده' | null;
  showPlanBadge?: boolean;
  testDataLabel?: string | null;
  /** Icon-only trigger for embedding beside share actions. */
  compact?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [dark, setDark] = useState(true);
  const [focus, setFocus] = useState(0);
  const [template, setTemplate] = useState<StoryTemplateId>('market_overview_clean');
  const [status, setStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [backgrounds, setBackgrounds] = useState<StoryBackground[]>([]);
  const [backgroundId, setBackgroundId] = useState('');
  const [backgroundError, setBackgroundError] = useState('');
  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    void fetch('/api/public/story-backgrounds', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      setBackgrounds(parseStoryBackgrounds((await response.json()).backgrounds)); setBackgroundError('');
    }).catch(() => { if (!controller.signal.aborted) setBackgroundError('پس‌زمینه‌های جدید دریافت نشدند؛ قالب‌های اصلی در دسترس‌اند.'); });
    return () => controller.abort();
  }, [opened]);

  const build = useCallback(async (nextTemplate: StoryTemplateId = template) => {
    setStatus('building');
    setError(null);
    try {
      const readJson = async <T,>(url: string): Promise<T | null> => {
        try {
          const response = await fetch(url, { cache: 'no-store' });
          return response.ok ? await response.json() as T : null;
        } catch { return null; }
      };
      const [snapshot, silverReport, goldHistory, silverHistory, coinHistory] = nextTemplate.startsWith('market_overview')
        ? await Promise.all([
          readJson<Snapshot>('/api/public/markets'),
          readJson<MarketViewReport>('/api/public/market-view?symbol=SILVER_999'),
          readJson<{ bars?: { c: number }[] }>('/api/public/markets/gold_melted/history?days=7&resolution=1D'),
          readJson<{ bars?: { c: number }[] }>('/api/public/markets/silver_999/history?days=7&resolution=1D'),
          readJson<{ bars?: { c: number }[] }>('/api/public/markets/seke_cash/history?days=7&resolution=1D'),
        ])
        : [null, null, null, null, null] as const;
      const payload = buildStoryPublicPayload(report, 'https://www.zarsignal.ir', {
        planLevel,
        planLabel,
        planStatus,
        showPlanBadge,
        testDataLabel,
        snapshot,
        silverReport,
        charts: {
          gold: goldHistory?.bars?.map(bar => Number(bar.c)).filter(Number.isFinite) ?? [],
          silver: silverHistory?.bars?.map(bar => Number(bar.c)).filter(Number.isFinite) ?? [],
          coin: coinHistory?.bars?.map(bar => Number(bar.c)).filter(Number.isFinite) ?? [],
        },
      });
      assertStoryPayloadPublic(payload);
      if (nextTemplate === 'studio_light' && payload.metrics[focus]) {
        payload.metrics = [payload.metrics[focus]!];
        payload.title = payload.metrics[0]!.label;
        payload.takeaway = `${payload.metrics[0]!.label}: ${payload.metrics[0]!.meaning}. این اختلاف، جهت حرکت بعدی قیمت را مشخص نمی‌کند.`;
      }
      const blob = await renderAnalysisStoryPng(payload, { template: nextTemplate, dark, background: backgrounds.find(item => item.id === backgroundId) });
      const nextFile = new File([blob], `zarsignal-story-${nextTemplate}-${Date.now()}.png`, { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setFile(nextFile);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'ساخت کارت ممکن نشد');
    }
  }, [report, planLevel, planLabel, planStatus, showPlanBadge, testDataLabel, template, dark, focus, backgrounds, backgroundId]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const download = useCallback(() => {
    if (!previewUrl || !file) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = file.name;
    a.click();
  }, [previewUrl, file]);

  const shareFile = useCallback(async () => {
    if (!file) return;
    try {
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'زرسیگنال',
          text: 'مقایسهٔ ارزش بازار — نه سیگنال خرید و فروش',
        });
        return;
      }
      download();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      download();
    }
  }, [file, download]);

  return (
    <div className={compact ? 'market-view__story is-inline' : 'market-view__story'} data-follow-keep>
      <button
        type="button"
        className={compact ? 'analysis-action analysis-story-trigger' : 'analysis-action'}
        aria-haspopup="dialog"
        aria-expanded={opened}
        title="ساخت استوری"
        aria-label="ساخت استوری"
        onClick={() => setOpened(true)}
      >
        <Sparkles size={16} aria-hidden />
        ساخت استوری
      </button>
      <OverlaySheet open={opened} title="استودیوی استوری" onClose={() => setOpened(false)}>
      <div className="analysis-story-studio">
      <p className="market-view__share-note">قالب و رنگ دلخواهتان را برای استوری انتخاب کنید.</p>
      <div className="market-view__story-templates" role="group" aria-label="قالب استوری">
        {STORY_TEMPLATES.map(id => (
          <button
            key={id}
            type="button"
            className={template === id ? 'is-active' : undefined}
            aria-pressed={template === id}
            disabled={status === 'building'}
            data-follow-keep
            onClick={() => {
              setTemplate(id);
              setStatus('idle');
            }}
          >
            <span className={`analysis-story-swatch is-${id}`} style={id.startsWith('market_overview') ? { backgroundImage: `url(/story-templates/${id === 'market_overview_clean' ? 'market-overview-clean.webp' : 'market-overview-rich.webp'})` } : undefined} aria-hidden="true">{id.startsWith('market_overview') ? null : <><i /><i /><i /></>}</span>
            {STORY_TEMPLATE_LABELS[id]}
          </button>
        ))}
      </div>
      {!template.startsWith('market_overview') ? <div className="story-theme-row"><span>رنگ تصویر</span><div className="alert-direction-options" role="group" aria-label="تم تصویر">{[{ value: true, label: 'تیره' }, { value: false, label: 'روشن' }].map(item => <button key={item.label} type="button" disabled={status === 'building'} aria-pressed={dark === item.value} onClick={() => { setDark(item.value); setStatus('idle'); }}>{item.label}</button>)}</div></div> : null}
      {!template.startsWith('market_overview') && backgrounds.length ? <div className="story-background-picker" role="group" aria-label="پس‌زمینه استوری">
        <button type="button" disabled={status === 'building'} aria-pressed={!backgroundId} onClick={() => { setBackgroundId(''); setStatus('idle'); }}>پس‌زمینه اصلی</button>
        {backgrounds.map(item => <button type="button" key={item.id} disabled={status === 'building'} aria-pressed={backgroundId === item.id} onClick={() => { setBackgroundId(item.id); setStatus('idle'); }}><span style={{ background: `linear-gradient(${item.start},${item.end})` }}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}</span>{item.title}</button>)}
      </div> : null}
      {backgroundError ? <p role="status">{backgroundError}</p> : null}
      {template === 'studio_light' ? <Select label="دارایی" disabled={status === 'building'} value={String(focus)} onChange={value => { setFocus(Number(value)); setStatus('idle'); }} options={buildStoryPublicPayload(report, 'https://www.zarsignal.ir').metrics.map((metric, index) => ({value:String(index),label:metric.label}))} /> : null}
      <button
        type="button"
        className="button small-button market-view__story-btn"
        onClick={() => void build(template)}
        disabled={status === 'building'}
      >
        <ImageDown size={16} aria-hidden />
        {status === 'building' ? 'در حال ساخت…' : 'ساخت پیش‌نمایش'}
      </button>
      <p className="market-view__share-note">
        خروجی ۱۰۸۰×۱۹۲۰ · فقط خلاصهٔ عمومی بازار
      </p>
      {status === 'error' && error ? (
        <p className="market-view__feedback-status is-error" role="alert">{error}</p>
      ) : null}
      {status === 'ready' && previewUrl ? (
        <div className="market-view__story-result">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="market-view__story-preview"><img src={previewUrl} alt={`پیش‌نمایش استوری ${STORY_TEMPLATE_LABELS[template]}`} width={180} height={320} /></div>
          <div className="market-view__engagement-actions">
            <button type="button" className="analysis-action" onClick={download}><Download size={18} aria-hidden /> ذخیره تصویر</button>
            <button type="button" className="analysis-icon-action" title="اشتراک تصویر" aria-label="اشتراک تصویر" onClick={() => void shareFile()}>
              <Share2 size={18} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
      </div>
      </OverlaySheet>
    </div>
  );
}
