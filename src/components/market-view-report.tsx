'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowUpLeft, RefreshCw } from 'lucide-react';
import type { MarketViewReport } from '@/lib/market-view-report';
import { formatFaPercent, formatTehranStamp } from '@/lib/market-view-report';
import { freshnessLabel } from '@/lib/bubbles';

function freshnessText(report: MarketViewReport) {
  if (report.dataFreshness === 'ok') return 'تازه';
  if (report.dataFreshness === 'stale') return 'قدیمی';
  if (report.dataFreshness === 'mixed') return 'ترکیبی · بخشی قدیمی';
  return 'ناموجود';
}

export function MarketViewReportView({
  initial,
  canRefresh,
}: {
  initial: MarketViewReport;
  canRefresh: boolean;
}) {
  const [report, setReport] = useState(initial);
  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setReport(initial); setPendingFingerprint(null); }, [initial]);

  const applyLatest = useCallback(async () => {
    const url = initial.symbol ? `/api/public/market-view?symbol=${initial.symbol.toLowerCase()}` : '/api/public/market-view';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('refresh_failed');
    return res.json() as Promise<MarketViewReport>;
  }, [initial.symbol]);

  useEffect(() => {
    if (!canRefresh) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const next = await applyLatest();
          if (!next) return;
          if (next.access !== report.access) {
            setReport(next);
            setPendingFingerprint(null);
            return;
          }
          if (next.snapshotFingerprint !== report.snapshotFingerprint) {
            setPendingFingerprint(next.snapshotFingerprint);
          }
        } catch { /* quiet */ }
      })();
    }, 45000);
    return () => window.clearInterval(id);
  }, [applyLatest, canRefresh, report.snapshotFingerprint, report.access]);

  function showFresh() {
    startTransition(async () => {
      setError(null);
      try {
        const next = await applyLatest();
        if (next) {
          setReport(next);
          setPendingFingerprint(null);
        }
      } catch { setError('دریافت گزارش تازه ممکن نشد؛ نسخهٔ قبلی حفظ شده است. دوباره تلاش کنید.'); }
    });
  }

  return (
    <article className="market-view" aria-label={report.title}>
      {pendingFingerprint ? (
        <div className="market-view__fresh-banner" role="status">
          <span>تحلیل تازه آماده است</span>
          <button type="button" className="button" onClick={showFresh} disabled={pending}>
            {pending ? 'در حال بارگذاری…' : 'نمایش نسخه تازه'}
          </button>
        </div>
      ) : null}

      <header className="market-view__hero">
        <span className="eyebrow">گزارش بازار</span>
        <h1>{report.title}</h1>
        <p className="market-view__meta">
          داده: {formatTehranStamp(report.dataObservedAtIso)} به وقت تهران
          {' · '}
          وضعیت: {freshnessText(report)}
          {' · '}
          تولید گزارش: {formatTehranStamp(report.generatedAtIso)}
        </p>
      </header>

      <section className="market-view__block">
        <h2 className="sr-only">خلاصه</h2>
        <p className="market-view__summary">{report.summaryLines[0]}</p>
        <p className="market-view__summary is-secondary">{report.summaryLines[1]}</p>
      </section>
      {report.currentQuote && <p className="market-view__meta">قیمت {report.currentQuote.label}: <bdi>{report.currentQuote.price}</bdi> / {report.currentQuote.unit}</p>}

      <section className="market-view__block">
        <h2>بازار چه می‌گوید؟</h2>
        <p>{report.marketSays}</p>
      </section>

      {report.evidence.length > 0 && <section className="market-view__block" aria-label="جدول شواهد">
        <h2>شواهد</h2>
        <div className="market-view__table-wrap">
          <table className="market-view__table" role="table">
            <thead>
              <tr>
                <th scope="col">بازار</th>
                <th scope="col">قیمت بازار</th>
                <th scope="col">مرجع محاسباتی</th>
                <th scope="col">اختلاف</th>
              </tr>
            </thead>
            <tbody>
              {report.evidence.map(row => (
                <tr key={row.id} className={row.status !== 'ok' ? 'is-muted' : undefined}>
                  <th scope="row">
                    <strong>{row.marketLabel}</strong>
                  </th>
                  <td data-label="قیمت بازار">{row.marketPriceLabel ?? 'در دسترس نیست'}</td>
                  <td data-label="مرجع محاسباتی">
                    {row.referenceLabel ?? 'در دسترس نیست'}
                  </td>
                  <td data-label="اختلاف">
                    {row.diffPercent != null
                      ? <bdi>{formatFaPercent(row.diffPercent)}٪</bdi>
                      : 'در دسترس نیست'}
                    {row.status !== 'ok' ? <small>{freshnessLabel(row.status === 'blocked' ? 'blocked' : row.status === 'stale' ? 'stale' : 'unavailable')}</small> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      {report.access === 'full' && report.reading ? (
        <section className="market-view__block">
          <h2>برداشت زرسیگنال</h2>
          <p>{report.reading}</p>
        </section>
      ) : null}

      {report.access === 'full' && report.conclusion ? (
        <section className="market-view__block">
          <h2>جمع‌بندی</h2>
          <p>{report.conclusion}</p>
        </section>
      ) : null}

      <details className="market-view__details">
        <summary>اعتبار داده و محدودیت‌های این تحلیل</summary>
        <ul className="market-view__list">{report.unconfirmed.map(item => <li key={item}>{item}</li>)}</ul>
      </details>

      {report.access === 'preview' && report.evidence.some(row => row.diffPercent != null) ? (
        <aside className="market-view__gate" aria-label="دسترسی کامل">
          <p>برداشت کامل، جمع‌بندی و تفسیر ارتباط اعداد با پلن دارای دسترسی تحلیل باز می‌شود. قیمت و خلاصهٔ شواهد همین‌جا رایگان است.</p>
          <div className="market-view__gate-actions">
            <Link className="button" href="/pricing">مشاهده پلن‌ها <ArrowUpLeft size={15} /></Link>
          </div>
        </aside>
      ) : null}

      {report.changeFromPrior ? (
        <section className="market-view__block">
          <h2>از گزارش قبل چه تغییری کرده؟</h2>
          <p>{report.changeFromPrior}</p>
        </section>
      ) : null}

      <details className="market-view__details">
        <summary>جزئیات فرمول و نسخه</summary>
        <ul className="market-view__list">
          {report.evidence.map(row => <li key={row.id}>{row.marketLabel}: {row.referenceBasis}. {row.unitNote}</li>)}
          {report.details.formulaNotes.map(note => <li key={note}>{note}</li>)}
        </ul>
        <p className="market-view__disclaimer">{report.details.disclaimer}</p>
        <p className="market-view__meta">شناسه گزارش: <bdi dir="ltr">{report.reportId}</bdi></p>
      </details>
      {error && <p role="alert" className="market-view__meta">{error}</p>}

      {canRefresh ? (
        <button type="button" className="market-view__reload text-link" onClick={showFresh} disabled={pending}>
          <RefreshCw size={14} /> بررسی دادهٔ تازه
        </button>
      ) : null}
    </article>
  );
}
