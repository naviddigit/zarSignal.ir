'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, Share2, Star } from 'lucide-react';
import { MarketAlertsClient } from '@/components/market-alerts-client';
import { hasCapability } from '@/lib/capabilities';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
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
  onReady,
  actions,
}: {
  report: MarketViewReport;
  signedIn: boolean;
  planLevel?: AccessLevel | null;
  planLabel?: string | null;
  planStatus?: 'فعال' | 'آزمایشی' | 'رایگان' | 'در انتظار پرداخت' | 'تعلیق‌شده' | null;
  onReady?: () => void;
  actions?: ReactNode;
}) {
  const [readCount, setReadCount] = useState<number | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [nextAllowedAt, setNextAllowedAt] = useState<string | null>(null);
  const [feedbackReady, setFeedbackReady] = useState(false);
  const [feedbackLoadError, setFeedbackLoadError] = useState<string | null>(null);
  const [canCreateNew, setCanCreateNew] = useState(false);
  const [availabilityCheck, setAvailabilityCheck] = useState(0);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'error'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);
  const submitting = useRef(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [leaving, setLeaving] = useState<{ href: string; label: string } | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);

  const engagementKey = `${report.reportId}:${report.schemaVersion}`;
  const collapsed = hasSaved && !editing;
  const displayRating = hover ?? rating;
  useEffect(() => { if (!signedIn || feedbackReady) onReady?.(); }, [signedIn, feedbackReady, onReady]);

  useEffect(() => {
    if (!signedIn) {
      setReadCount(null);
      setReadError(null);
      setRating(null);
      setComment('');
      setHasSaved(false);
      setEditing(false);
      return;
    }
    setFeedbackReady(false);
    setFeedbackLoadError(null);
    setCanCreateNew(false);
    setNextAllowedAt(null);
    setRating(null);
    setComment('');
    setHasSaved(false);
    setEditing(false);
    let cancelled = false;
    void (async () => {
      try {
        const existing = await fetch(
          `/api/public/analysis/feedback?reportId=${encodeURIComponent(report.reportId)}&schemaVersion=${encodeURIComponent(report.schemaVersion)}`,
          { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8000) },
        );
        if (!existing.ok) throw new Error(existing.status === 401 ? 'نشست شما منقضی شده است؛ دوباره وارد حساب شوید.' : 'دریافت بازخورد قبلی ممکن نشد؛ دوباره تلاش کنید.');
        if (!cancelled && existing.ok) {
          const data = await existing.json() as {
            feedback?: { rating: number; comment: string | null } | null;
            nextAllowedAt?: string | null;
            canCreateNew?: boolean;
          };
          if (data.feedback) {
            setRating(data.feedback.rating);
            setComment(data.feedback.comment ?? '');
            setHasSaved(true);
            setEditing(false);
            setFeedbackStatus('saved');
          } else {
            setHasSaved(false);
            setEditing(false);
            setFeedbackStatus('idle');
          }
          setNextAllowedAt(data.nextAllowedAt ?? null);
          setCanCreateNew(data.canCreateNew === true);
          setFeedbackReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setCanCreateNew(false);
          setFeedbackLoadError(error instanceof Error && error.name === 'Error' ? error.message : 'پاسخ سرور نرسید؛ دوباره تلاش کنید.');
          setFeedbackReady(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [signedIn, report.reportId, report.schemaVersion, availabilityCheck]);

  useEffect(() => {
    if (!signedIn) return;
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
          setReadCount(null);
        } else {
          setReadCount(null);
          setReadError('ثبت مطالعه ممکن نشد؛ عدد ساختگی نمایش داده نمی‌شود.');
        }
      } catch {
        if (!cancelled) {
          setReadCount(null);
          setReadError('ثبت مطالعه ممکن نشد؛ عدد ساختگی نمایش داده نمی‌شود.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [signedIn, engagementKey, report.reportId, report.schemaVersion, report.symbol]);

  useEffect(() => {
    if (canCreateNew || !nextAllowedAt) return;
    const remaining = Date.parse(nextAllowedAt) - Date.now();
    if (!Number.isFinite(remaining)) return;
    const timer = window.setTimeout(() => setAvailabilityCheck(value => value + 1), Math.max(1000, Math.min(remaining + 250, 2_147_483_647)));
    return () => window.clearTimeout(timer);
  }, [canCreateNew, nextAllowedAt]);

  const submitFeedback = useCallback(async () => {
    if (!signedIn || !feedbackReady || (!hasSaved && !canCreateNew) || rating == null || submitting.current) return;
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
      const data = await res.json().catch(() => null) as {
        error?: string;
        nextAllowedAt?: string;
        feedback?: { rating: number; comment: string | null };
      } | null;
      if (!res.ok) {
        if (data?.nextAllowedAt) {
          setNextAllowedAt(data.nextAllowedAt);
          setCanCreateNew(false);
        }
        throw new Error(data?.error ?? 'ذخیره نشد');
      }
      if (data?.feedback) {
        setRating(data.feedback.rating);
        setComment(data.feedback.comment ?? '');
      }
      setHasSaved(true);
      setEditing(false);
      setFeedbackStatus('saved');
    } catch (err) {
      setFeedbackStatus('error');
      setFeedbackError(err instanceof Error ? err.message : 'ذخیرهٔ بازخورد ممکن نشد');
    } finally {
      submitting.current = false;
    }
  }, [signedIn, feedbackReady, hasSaved, canCreateNew, rating, comment, report.reportId, report.schemaVersion]);

  const shareSummary = useCallback(async (copyOnly = false) => {
    setShareError(null);
    const origin = window.location.origin;
    const summary = buildPublicShareSummary(report, origin);
    try {
      if (!copyOnly && typeof navigator.share === 'function') {
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
    <section className="market-view__engagement is-tidy" aria-label="بازخورد و اشتراک" data-follow-anchor onClickCapture={event => {
        const link = (event.target as Element).closest('a[href]') as HTMLAnchorElement | null;
        if (!link) return;
        event.preventDefault(); event.stopPropagation();
        if (new URL(link.href).pathname === '/alerts') setAlertOpen(true);
        else setLeaving({ href: link.getAttribute('href')!, label: link.getAttribute('aria-label') || link.textContent || 'صفحه دیگر' });
      }}>
      <div className="market-view__engagement-actions analysis-toolbar" role="group" aria-label="ابزارهای تحلیل">
        <button type="button" className="analysis-icon-action" title="کپی خلاصه" aria-label="کپی خلاصه" onClick={() => void shareSummary(true)}>
          {shareStatus === 'copied' ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
        </button>
        <button type="button" className="analysis-icon-action" title="اشتراک خلاصه" aria-label="اشتراک خلاصه" onClick={() => void shareSummary()}><Share2 size={18} aria-hidden /></button>
        {signedIn ? <button type="button" className="analysis-icon-action" title="امتیاز و بازخورد" aria-label="امتیاز و بازخورد" aria-haspopup="dialog" aria-expanded={feedbackOpen} onClick={() => setFeedbackOpen(true)}>
          <Star size={18} fill={hasSaved ? 'currentColor' : 'none'} aria-hidden />
        </button> : null}
        <AnalysisStoryCardButton compact report={report} planLevel={planLevel} planLabel={planLabel} planStatus={planStatus} showPlanBadge={false} />
        {actions}
        {signedIn && readCount != null ? <small className="analysis-toolbar__reads" title="تعداد گزارش‌های مشاهده‌شده" role="status">{new Intl.NumberFormat('fa-IR').format(readCount)} مطالعه</small> : null}
      </div>
      <OverlaySheet open={!!leaving} title="از گزارش خارج می‌شوید؟" onClose={() => setLeaving(null)}>
        <div className="analysis-dialog-form"><p>برای باز کردن «{leaving?.label}» از این صفحه خارج می‌شوید.</p><div className="analysis-dialog-buttons"><button className="button" onClick={() => { const href = leaving?.href; setLeaving(null); if (href) window.location.assign(href); }}>ادامه و خروج</button><button className="analysis-action" onClick={() => setLeaving(null)}>ماندن در گزارش</button></div></div>
      </OverlaySheet>
      <OverlaySheet open={alertOpen} title="هشدار تغییر بازار" onClose={() => setAlertOpen(false)}>
        {alertOpen ? <MarketAlertsClient embedded initialSymbol={report.symbol ?? undefined} canManage={signedIn && hasCapability(planLevel ?? 'FREE', 'BASIC_ALERTS') && planStatus !== 'در انتظار پرداخت'} /> : null}
      </OverlaySheet>
      <OverlaySheet open={feedbackOpen} title="امتیاز و بازخورد" onClose={() => setFeedbackOpen(false)}>
        <div className="market-view__feedback analysis-dialog-form">
          {feedbackReady && !feedbackLoadError && !hasSaved && !canCreateNew ? <div role="status">
            <p className="market-view__feedback-status">
              {!feedbackReady ? 'در حال بررسی بازخورد…' : nextAllowedAt
                ? `بازخورد جدید از ${new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' }).format(new Date(nextAllowedAt))} امکان‌پذیر است.`
                : 'ثبت بازخورد فعلاً ممکن نیست؛ دوباره تلاش کنید.'}
            </p>
            {feedbackReady && !nextAllowedAt ? <button type="button" className="analysis-action" onClick={() => setAvailabilityCheck(value => value + 1)}>تلاش دوباره</button> : null}
          </div> : collapsed ? <div className="market-view__feedback-saved">
            <p className="market-view__feedback-status is-ok"><Check size={16} aria-hidden />بازخورد شما ثبت شد</p>
            <div className="market-view__stars is-readonly" aria-label={`امتیاز ${rating} از ۵`}>
              {RATING_LABELS.map((_, index) => <Star key={index} size={22} className={rating != null && index < rating ? 'is-on' : undefined} fill={rating != null && index < rating ? 'currentColor' : 'none'} aria-hidden />)}
            </div>
            <p className="analysis-rating-caption" aria-live="polite">{rating ? RATING_LABELS[rating - 1] : 'برای امتیاز دادن یک ستاره انتخاب کنید'}</p>
            {comment ? <p>{comment}</p> : null}
            <button type="button" className="analysis-action" onClick={() => { setEditing(true); setFeedbackStatus('idle'); }}>ویرایش بازخورد</button>
          </div> : <form onSubmit={event => { event.preventDefault(); void submitFeedback(); }}>
            {!feedbackReady ? <p className="market-view__feedback-status" role="status">در حال دریافت بازخورد قبلی؛ پس از بررسی می‌توانید ارسال کنید.</p> : null}
            {feedbackLoadError ? <div role="alert"><p className="market-view__feedback-status is-error">{feedbackLoadError}</p><button type="button" className="analysis-action" onClick={() => setAvailabilityCheck(value => value + 1)}>تلاش دوباره</button></div> : null}
            <p className="market-view__feedback-prompt" id="analysis-feedback-label">این تحلیل چقدر برایتان مفید بود؟</p>
            <div className="market-view__stars" role="radiogroup" aria-labelledby="analysis-feedback-label" onMouseLeave={() => setHover(null)}>
              {RATING_LABELS.map((label, index) => {
                const value = index + 1;
                const on = displayRating != null && value <= displayRating;
                return <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} از ۵ — ${label}`} className={on ? 'is-on' : undefined} onMouseEnter={() => setHover(value)} onFocus={() => setHover(value)} onBlur={() => setHover(null)} onClick={() => { setRating(value); setFeedbackStatus('idle'); }}>
                  <Star size={22} fill={on ? 'currentColor' : 'none'} aria-hidden />
                </button>;
              })}
            </div>
            <p className="analysis-rating-caption" aria-live="polite">{rating ? RATING_LABELS[rating - 1] : 'برای امتیاز دادن یک ستاره انتخاب کنید'}</p>
            <details className="market-view__comment-details">
              <summary>توضیح اختیاری</summary>
              <label className="market-view__feedback-comment">
                <span className="visually-hidden">بازخورد اختیاری</span>
                <textarea value={comment} maxLength={500} rows={2} placeholder="بازخورد اختیاری (حداکثر ۵۰۰ نویسه)" onChange={event => { setComment(event.target.value); setFeedbackStatus('idle'); }} />
              </label>
            </details>
            <div className="market-view__engagement-actions">
              <button type="submit" className="button" disabled={!feedbackReady || !!feedbackLoadError || rating == null || feedbackStatus === 'saving'}>{feedbackStatus === 'saving' ? 'در حال ارسال…' : hasSaved ? 'ذخیرهٔ ویرایش' : 'ارسال بازخورد'}</button>
              {hasSaved ? <button type="button" className="analysis-action" onClick={() => { setEditing(false); setAvailabilityCheck(value => value + 1); }}>انصراف</button> : null}
            </div>
            {feedbackStatus === 'error' && feedbackError ? <p className="market-view__feedback-status is-error" role="alert">{feedbackError}</p> : null}
          </form>}
        </div>
      </OverlaySheet>
      {readError ? <p className="market-view__feedback-status is-error" role="status">{readError}</p> : null}
      {shareStatus === 'shared' || shareStatus === 'copied' ? <p className="market-view__feedback-status is-ok" role="status">{shareStatus === 'shared' ? 'خلاصه ارسال شد.' : 'خلاصه کپی شد.'}</p> : null}
      {shareStatus === 'error' && shareError ? <p className="market-view__feedback-status is-error" role="alert">{shareError}</p> : null}
    </section>
  );
}
