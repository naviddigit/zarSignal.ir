'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import type { MarketViewReport } from '@/lib/market-view-report';
import { buildPublicShareSummary } from '@/lib/analysis-share';
import { AnalysisStoryCardButton } from '@/components/analysis-story-card';
import type { AccessLevel } from '@/lib/capabilities';

const RATING_LABELS = ['خیلی ضعیف', 'ضعیف', 'قابل قبول', 'روشن', 'بسیار مفید'] as const;

export function AnalysisEngagementPanel({
  report,
  signedIn,
  planLevel = null,
  planLabel = null,
  planStatus = null,
}: {
  report: MarketViewReport;
  signedIn: boolean;
  planLevel?: AccessLevel | null;
  planLabel?: string | null;
  planStatus?: 'فعال' | 'آزمایشی' | 'رایگان' | 'در انتظار پرداخت' | null;
}) {
  const [readCount, setReadCount] = useState<number | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'error'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);
  const recordedKey = useRef<string | null>(null);
  const submitting = useRef(false);

  const engagementKey = `${report.reportId}:${report.schemaVersion}`;

  useEffect(() => {
    if (!signedIn) {
      setReadCount(null);
      setReadError(null);
      setRating(null);
      setComment('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const existing = await fetch(
          `/api/public/analysis/feedback?reportId=${encodeURIComponent(report.reportId)}&schemaVersion=${encodeURIComponent(report.schemaVersion)}`,
          { credentials: 'same-origin', cache: 'no-store' },
        );
        if (!cancelled && existing.ok) {
          const data = await existing.json() as { feedback?: { rating: number; comment: string | null } | null };
          if (data.feedback) {
            setRating(data.feedback.rating);
            setComment(data.feedback.comment ?? '');
          }
        }
      } catch { /* quiet */ }
    })();
    return () => { cancelled = true; };
  }, [signedIn, report.reportId, report.schemaVersion]);

  useEffect(() => {
    if (!signedIn) return;
    if (recordedKey.current === engagementKey) return;
    recordedKey.current = engagementKey;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/public/analysis/read', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId: report.reportId,
            schemaVersion: report.schemaVersion,
            symbol: report.symbol ?? null,
          }),
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json() as { count: number };
          setReadCount(data.count);
          setReadError(null);
        } else if (res.status === 401) {
          recordedKey.current = null;
          setReadCount(null);
        } else {
          recordedKey.current = null;
          setReadCount(null);
          setReadError('ثبت مطالعه ممکن نشد؛ عدد ساختگی نمایش داده نمی‌شود.');
        }
      } catch {
        if (!cancelled) {
          recordedKey.current = null;
          setReadCount(null);
          setReadError('ثبت مطالعه ممکن نشد؛ عدد ساختگی نمایش داده نمی‌شود.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [signedIn, engagementKey, report.reportId, report.schemaVersion, report.symbol]);

  const submitFeedback = useCallback(async () => {
    if (!signedIn || rating == null || submitting.current) return;
    submitting.current = true;
    setFeedbackStatus('saving');
    setFeedbackError(null);
    try {
      const res = await fetch('/api/public/analysis/feedback', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.reportId,
          schemaVersion: report.schemaVersion,
          rating,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? 'ذخیره نشد');
      }
      setFeedbackStatus('saved');
    } catch (err) {
      setFeedbackStatus('error');
      setFeedbackError(err instanceof Error ? err.message : 'ذخیرهٔ بازخورد ممکن نشد');
    } finally {
      submitting.current = false;
    }
  }, [signedIn, rating, comment, report.reportId, report.schemaVersion]);

  const shareSummary = useCallback(async () => {
    setShareError(null);
    const origin = window.location.origin;
    const summary = buildPublicShareSummary(report, origin);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: summary.title, text: summary.text, url: summary.url });
        setShareStatus('shared');
        return;
      }
      await navigator.clipboard.writeText(summary.text);
      setShareStatus('copied');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(summary.text);
        setShareStatus('copied');
      } catch {
        setShareStatus('error');
        setShareError('اشتراک‌گذاری ممکن نشد؛ متن را دستی کپی کنید.');
      }
    }
  }, [report]);

  return (
    <section className="market-view__engagement" aria-label="شمارش مطالعه، بازخورد و اشتراک">
      {signedIn && readCount != null ? (
        <p className="market-view__read-chip" role="status">
          <span className="market-view__chip is-reads">
            {new Intl.NumberFormat('fa-IR').format(readCount)} گزارش خوانده‌شده
          </span>
          <span className="market-view__read-chip-title">شمارندهٔ مطالعه</span>
        </p>
      ) : null}
      {signedIn && readError ? (
        <p className="market-view__feedback-status is-error" role="status">{readError}</p>
      ) : null}

      {signedIn ? (
        <form
          className="market-view__feedback"
          onSubmit={event => {
            event.preventDefault();
            void submitFeedback();
          }}
        >
          <p className="market-view__feedback-prompt" id="analysis-feedback-label" data-follow-anchor>
            این تحلیل چقدر برایتان روشن و مفید بود؟
          </p>
          <div className="market-view__rating" role="group" aria-labelledby="analysis-feedback-label">
            {RATING_LABELS.map((label, index) => {
              const value = index + 1;
              return (
                <label key={value} className={`market-view__rating-option${rating === value ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="analysis-rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => {
                      setRating(value);
                      setFeedbackStatus('idle');
                    }}
                  />
                  <span aria-hidden="true">{new Intl.NumberFormat('fa-IR').format(value)}</span>
                  <span className="visually-hidden">{value} از ۵ — {label}</span>
                </label>
              );
            })}
          </div>
          <label className="market-view__feedback-comment">
            <span className="visually-hidden">بازخورد اختیاری</span>
            <textarea
              value={comment}
              maxLength={500}
              rows={2}
              placeholder="بازخورد اختیاری (حداکثر ۵۰۰ نویسه)"
              onChange={event => {
                setComment(event.target.value);
                setFeedbackStatus('idle');
              }}
            />
          </label>
          <div className="market-view__engagement-actions">
            <button
              type="submit"
              className="button small-button"
              disabled={rating == null || feedbackStatus === 'saving'}
            >
              {feedbackStatus === 'saving' ? 'در حال ارسال…' : 'ارسال بازخورد'}
            </button>
            <button type="button" className="button small-button market-view__share-btn" onClick={() => void shareSummary()}>
              {shareStatus === 'copied' ? <Copy size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
              اشتراک خلاصه
            </button>
          </div>
          {feedbackStatus === 'saved' ? (
            <p className="market-view__feedback-status is-ok" role="status">بازخورد ذخیره شد؛ در صورت نیاز می‌توانید ویرایش کنید.</p>
          ) : null}
          {feedbackStatus === 'error' && feedbackError ? (
            <p className="market-view__feedback-status is-error" role="alert">{feedbackError}</p>
          ) : null}
          {shareStatus === 'shared' ? (
            <p className="market-view__feedback-status is-ok" role="status"><Check size={14} aria-hidden /> خلاصه ارسال شد.</p>
          ) : null}
          {shareStatus === 'copied' ? (
            <p className="market-view__feedback-status is-ok" role="status">خلاصه در حافظه کپی شد.</p>
          ) : null}
          {shareStatus === 'error' && shareError ? (
            <p className="market-view__feedback-status is-error" role="alert">{shareError}</p>
          ) : null}
        </form>
      ) : (
        <div className="market-view__share" data-follow-anchor>
          <button type="button" className="button small-button market-view__share-btn" onClick={() => void shareSummary()}>
            {shareStatus === 'copied' ? <Copy size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
            اشتراک خلاصهٔ عمومی
          </button>
          <p className="market-view__share-note">
            فقط نماد، زمان داده، دید ارزشی کوتاه و لینک عمومی — بدون متن کامل و بدون پارامتر درخواست.
          </p>
          {shareStatus === 'shared' || shareStatus === 'copied' ? (
            <p className="market-view__feedback-status is-ok" role="status">
              {shareStatus === 'shared' ? 'خلاصه ارسال شد.' : 'خلاصه در حافظه کپی شد.'}
            </p>
          ) : null}
          {shareStatus === 'error' && shareError ? (
            <p className="market-view__feedback-status is-error" role="alert">{shareError}</p>
          ) : null}
        </div>
      )}

      <AnalysisStoryCardButton
        report={report}
        planLevel={planLevel}
        planLabel={planLabel}
        planStatus={planStatus}
        showPlanBadge={false}
      />
    </section>
  );
}
