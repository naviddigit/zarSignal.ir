'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageDown, Share2 } from 'lucide-react';
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
}: {
  report: MarketViewReport;
  planLevel?: AccessLevel | null;
  planLabel?: string | null;
  planStatus?: 'فعال' | 'آزمایشی' | 'رایگان' | 'در انتظار پرداخت' | 'تعلیق‌شده' | null;
  showPlanBadge?: boolean;
  testDataLabel?: string | null;
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
    <div className="market-view__story" data-follow-keep>
      <button type="button" className="button small-button" aria-expanded={opened} onClick={() => setOpened(value => !value)}>ساخت استوری</button>
      {opened ? <>
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
            {STORY_TEMPLATE_LABELS[id]}
          </button>
        ))}
      </div>
      <label>تم تصویر <select className="ds-input" disabled={status === 'building'} value={dark ? 'dark' : 'light'} onChange={event => { setDark(event.target.value === 'dark'); setStatus('idle'); }}><option value="dark">تیره طلایی</option><option value="light">روشن</option></select></label>
      {template === 'studio_light' ? <label>دارایی <select className="ds-input" disabled={status === 'building'} value={focus} onChange={event => { setFocus(Number(event.target.value)); setStatus('idle'); }}>{buildStoryPublicPayload(report, 'https://www.zarsignal.ir').metrics.map((metric, index) => <option key={index} value={index}>{metric.label}</option>)}</select></label> : null}
      <button
        type="button"
        className="button small-button market-view__story-btn"
        onClick={() => void build(template)}
        disabled={status === 'building'}
      >
        <ImageDown size={16} aria-hidden />
        {status === 'building' ? 'در حال ساخت…' : 'پیش‌نمایش و ساخت PNG'}
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
            <button type="button" className="button small-button" onClick={download}>دانلود PNG</button>
            <button type="button" className="button small-button" onClick={() => void shareFile()}>
              <Share2 size={16} aria-hidden /> اشتراک فایل
            </button>
          </div>
        </div>
      ) : null}
      </> : null}
    </div>
  );
}
