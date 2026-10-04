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
  const [template, setTemplate] = useState<StoryTemplateId>('vault_dark');
  const [status, setStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const build = useCallback(async (nextTemplate: StoryTemplateId = template) => {
    setStatus('building');
    setError(null);
    try {
      const payload = buildStoryPublicPayload(report, 'https://www.zarsignal.ir', {
        planLevel,
        planLabel,
        planStatus,
        showPlanBadge,
        testDataLabel,
      });
      assertStoryPayloadPublic(payload);
      if (nextTemplate === 'studio_light' && payload.metrics[focus]) {
        payload.metrics = [payload.metrics[focus]!];
        payload.title = payload.metrics[0]!.label;
        payload.takeaway = `${payload.metrics[0]!.label}: ${payload.metrics[0]!.meaning}. این اختلاف، جهت حرکت بعدی قیمت را مشخص نمی‌کند.`;
      }
      const blob = await renderAnalysisStoryPng(payload, { template: nextTemplate, dark });
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
  }, [report, planLevel, planLabel, planStatus, showPlanBadge, testDataLabel, template, dark, focus]);

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
        className={compact ? 'analysis-action is-compact-story' : 'analysis-action'}
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
      <p className="market-view__share-note">قالب دلخواهتان را انتخاب کنید؛ یک خلاصهٔ تصویری با برند زرسیگنال و لینک عمومی بازار بسازید.</p>
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
            <span className={`analysis-story-swatch is-${id}`} aria-hidden="true"><i /><i /><i /></span>
            {STORY_TEMPLATE_LABELS[id]}
          </button>
        ))}
      </div>
      <Select label="تم تصویر" disabled={status === 'building'} value={dark ? 'dark' : 'light'} onChange={value => { setDark(value === 'dark'); setStatus('idle'); }} options={[{value:'dark',label:'شب طلایی'},{value:'light',label:'روشن و نقره‌ای'}]} />
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
        قالب استوری ۱۰۸۰×۱۹۲۰ · بدون دادهٔ خصوصی حساب.
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
