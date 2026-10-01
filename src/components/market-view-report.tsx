'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowUpLeft, CircleHelp, RefreshCw, ShieldAlert } from 'lucide-react';
import type { MarketViewDecision, MarketViewReport } from '@/lib/market-view-report';
import { formatFaPercent, formatTehranStamp } from '@/lib/market-view-report';
import { freshnessLabel } from '@/lib/bubbles';

function freshnessText(report: MarketViewReport) {
  if (report.dataFreshness === 'ok') return 'تازه';
  if (report.dataFreshness === 'stale') return 'قدیمی';
  if (report.dataFreshness === 'mixed') return 'ترکیبی · بخشی قدیمی';
  return 'ناموجود';
}

function decisionTone(kind: MarketViewDecision['kind']) {
  if (kind === 'buy') return 'is-buy';
  if (kind === 'sell') return 'is-sell';
  if (kind === 'hold') return 'is-hold';
  if (kind === 'insufficient_data') return 'is-empty';
  return 'is-pending';
}

function DecisionIcon({ kind }: { kind: MarketViewDecision['kind'] }) {
  if (kind === 'insufficient_data') return <CircleHelp size={22} strokeWidth={2.1} aria-hidden />;
  if (kind === 'buy' || kind === 'sell' || kind === 'hold') return <ShieldAlert size={22} strokeWidth={2.1} aria-hidden />;
  return <AlertTriangle size={22} strokeWidth={2.1} aria-hidden />;
}

function ValuationChips({ report }: { report: MarketViewReport }) {
  if (!report.valuationMarks.length) return null;
  return (
    <ul className="market-view__marks" aria-label="نشان ارزشی نسبت به مرجع">
      {report.valuationMarks.map(mark => (
        <li key={mark.id} className={`market-view__mark is-${mark.stance}`}>
          <span>{mark.label}</span>
          <strong>{mark.stanceLabel}</strong>
        </li>
      ))}
    </ul>
  );
}

function DecisionCard({ decision }: { decision: MarketViewDecision }) {
  return (
    <section className={`market-view__verdict ${decisionTone(decision.kind)}`} aria-label="کارت نتیجه">
      <div className="market-view__verdict-badge" aria-hidden="true">
        <DecisionIcon kind={decision.kind} />
      </div>
      <div className="market-view__verdict-body">
        <p className="market-view__verdict-kicker">نتیجه</p>
        <h2>{decision.title}</h2>
        <p>{decision.reason}</p>
        <p className="market-view__verdict-change"><span>شرایط تغییر:</span> {decision.changeConditions}</p>
      </div>
    </section>
  );
}

type NarrativeSection = { id: string; title?: string; body: string };

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

/** Progressive section reveal — report display only, not live AI generation. */
function useNarrativeReveal(reportKey: string, sectionCount: number, reducedMotion: boolean) {
  const [revealed, setRevealed] = useState(sectionCount);
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  const skip = useCallback(() => {
    clearTimers();
    setRevealed(sectionCount);
    setTyping(false);
  }, [clearTimers, sectionCount]);

  useEffect(() => {
    clearTimers();
    if (reducedMotion || sectionCount === 0) {
      setRevealed(sectionCount);
      setTyping(false);
      return;
    }
    setRevealed(0);
    setTyping(true);
    let step = 0;
    const tick = () => {
      step += 1;
      setRevealed(step);
      if (step >= sectionCount) {
        setTyping(false);
        return;
      }
      timers.current.push(window.setTimeout(tick, 520));
    };
    timers.current.push(window.setTimeout(tick, 280));
    return () => clearTimers();
  }, [reportKey, sectionCount, reducedMotion, clearTimers]);

  return { revealed, typing, skip };
}

function NarrativeBlock({
  sections,
  reportKey,
}: {
  sections: NarrativeSection[];
  reportKey: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { revealed, typing, skip } = useNarrativeReveal(reportKey, sections.length, reduced);

  return (
    <div className="market-view__narrative" data-typing={typing ? 'on' : 'off'}>
      {typing ? (
        <div className="visually-hidden">
          {sections.map(section => (
            <section key={`a11y-${section.id}`}>
              {section.title ? <h2>{section.title}</h2> : null}
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      ) : null}
      <div aria-hidden={typing || undefined}>
        {sections.map((section, index) => {
          const visible = !typing || index < revealed;
          return (
            <section
              key={section.id}
              className={`market-view__block market-view__typed ${visible ? 'is-in' : 'is-out'}`}
            >
              {section.title ? <h2>{section.title}</h2> : null}
              <p>{section.body}</p>
            </section>
          );
        })}
      </div>
      {typing ? (
        <div className="market-view__typing-bar">
          <button type="button" className="button small-button" onClick={skip}>
            نمایش کامل
          </button>
          <span className="market-view__typing-note">نمایش گزارش آماده · تولید زندهٔ هوش مصنوعی نیست</span>
        </div>
      ) : null}
    </div>
  );
}

export function MarketViewReportView({
  initial,
  canRefresh,
  trialCta,
}: {
  initial: MarketViewReport;
  canRefresh: boolean;
  trialCta?: ReactNode;
}) {
  const [report, setReport] = useState(initial);
  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sync from server navigation (new symbol / SSR), not from theme or poll alone.
  useEffect(() => {
    setReport(initial);
    setPendingFingerprint(null);
  }, [initial]);

  const applyLatest = useCallback(async () => {
    const url = initial.symbol
      ? `/api/public/market-view?symbol=${initial.symbol.toLowerCase()}`
      : '/api/public/market-view';
    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
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
          // Access upgrade/downgrade must apply immediately.
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
      } catch {
        setError('دریافت گزارش تازه ممکن نشد؛ نسخهٔ قبلی حفظ شده است. دوباره تلاش کنید.');
      }
    });
  }

  const reportKey = `${report.snapshotFingerprint}:${report.symbol ?? 'all'}:${report.access}:${report.reportId}`;
  const narrative: NarrativeSection[] = [
    { id: 'summary', title: 'خلاصهٔ دید فعلی', body: report.summaryLines[0] },
    { id: 'market', title: 'شواهد چه می‌گویند؟', body: report.marketSays },
  ];
  if (report.access === 'full' && report.reading) {
    narrative.push({ id: 'reading', title: 'برداشت زرسیگنال', body: report.reading });
  }
  if (report.access === 'full' && report.conclusion) {
    narrative.push({ id: 'note', title: 'نکتهٔ جمع‌بندی', body: report.conclusion });
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
        <div className="market-view__brand" aria-hidden="true">
          <span className="brand-mark"><Activity size={26} /></span>
          <span className="market-view__brand-name">زر<span className="gold-text">سیگنال</span></span>
        </div>
        <span className="eyebrow">گزارش بازار</span>
        <h1>{report.title}</h1>
        <p className="market-view__meta" role="status">
          داده: {formatTehranStamp(report.dataObservedAtIso)} به وقت تهران
          {' · '}
          وضعیت: {freshnessText(report)}
          {' · '}
          تولید گزارش: {formatTehranStamp(report.generatedAtIso)}
        </p>
        {report.currentQuote ? (
          <p className="market-view__meta">
            قیمت {report.currentQuote.label}: <bdi>{report.currentQuote.price}</bdi> / {report.currentQuote.unit}
          </p>
        ) : null}
      </header>

      <div className="market-view__stage">
        <div className="market-view__watermark" aria-hidden="true">
          <span className="brand-mark"><Activity size={120} /></span>
          <span>زرسیگنال</span>
        </div>

        <NarrativeBlock sections={narrative} reportKey={reportKey} />

        <ValuationChips report={report} />

        {report.access === 'full' ? (
          <DecisionCard decision={report.decision} />
        ) : (
          <aside className="market-view__gate" aria-label="پیش‌نمایش تحلیل">
            <DecisionCard decision={report.decision} />
            <p>برداشت کامل و کارت نتیجهٔ تأییدشده با پلن دارای دسترسی تحلیل یا دورهٔ آزمایش باز می‌شود. قیمت و خلاصهٔ شواهد رایگان است.</p>
            <div className="market-view__gate-actions">
              <Link className="button" href="/pricing">مشاهده پلن‌ها <ArrowUpLeft size={15} /></Link>
              {trialCta}
            </div>
          </aside>
        )}
      </div>

      {report.evidence.length > 0 ? (
        <details className="market-view__details">
          <summary>جدول شواهد و اختلاف با مرجع</summary>
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
                    <th scope="row"><strong>{row.marketLabel}</strong></th>
                    <td data-label="قیمت بازار">{row.marketPriceLabel ?? 'در دسترس نیست'}</td>
                    <td data-label="مرجع محاسباتی">{row.referenceLabel ?? 'در دسترس نیست'}</td>
                    <td data-label="اختلاف">
                      {row.diffPercent != null
                        ? <bdi>{formatFaPercent(row.diffPercent)}٪</bdi>
                        : 'در دسترس نیست'}
                      {row.status !== 'ok' ? (
                        <small>{freshnessLabel(row.status === 'blocked' ? 'blocked' : row.status === 'stale' ? 'stale' : 'unavailable')}</small>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      <details className="market-view__details">
        <summary>اعتبار داده و محدودیت‌های این تحلیل</summary>
        <ul className="market-view__list">{report.unconfirmed.map(item => <li key={item}>{item}</li>)}</ul>
      </details>

      {report.changeFromPrior ? (
        <section className="market-view__block">
          <h2>از گزارش قبل چه تغییری کرده؟</h2>
          <p>{report.changeFromPrior}</p>
        </section>
      ) : null}

      <details className="market-view__details">
        <summary>جزئیات فرمول و نسخه</summary>
        <ul className="market-view__list">
          {report.evidence.map(row => (
            <li key={row.id}>{row.marketLabel}: {row.referenceBasis}. {row.unitNote}</li>
          ))}
          {report.details.formulaNotes.map(note => <li key={note}>{note}</li>)}
        </ul>
        <p className="market-view__disclaimer">{report.details.disclaimer}</p>
        <p className="market-view__meta">شناسه گزارش: <bdi dir="ltr">{report.reportId}</bdi></p>
      </details>

      {error ? <p role="alert" className="market-view__meta">{error}</p> : null}

      {canRefresh ? (
        <button type="button" className="market-view__reload text-link" onClick={showFresh} disabled={pending}>
          <RefreshCw size={14} /> بررسی دادهٔ تازه
        </button>
      ) : null}
    </article>
  );
}
