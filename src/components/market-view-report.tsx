'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowUpLeft, CircleHelp, RefreshCw, ShieldAlert } from 'lucide-react';
import type { MarketViewDecision, MarketViewReport } from '@/lib/market-view-report';
import { formatFaPercent, formatTehranStamp } from '@/lib/market-view-report';
import {
  activeSectionIndex,
  flattenNarrativeGraphemes,
  typingIntervalMs,
  visibleBodiesAt,
  type NarrativeSection,
} from '@/lib/market-view-typing';
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

function valuationTone(stance: NonNullable<MarketViewDecision['valuation']>['stance']) {
  if (stance === 'below') return 'is-below';
  if (stance === 'above') return 'is-above';
  if (stance === 'equal') return 'is-equal';
  return 'is-unknown';
}

function DecisionIcon({ kind }: { kind: MarketViewDecision['kind'] }) {
  if (kind === 'insufficient_data') return <CircleHelp size={20} strokeWidth={2.1} aria-hidden />;
  if (kind === 'buy' || kind === 'sell' || kind === 'hold') return <ShieldAlert size={20} strokeWidth={2.1} aria-hidden />;
  return <AlertTriangle size={20} strokeWidth={2.1} aria-hidden />;
}

function ValuationChips({ report }: { report: MarketViewReport }) {
  if (!report.valuationMarks.length) return null;
  return (
    <ul className="market-view__marks" aria-label="نشان ارزشی نسبت به مرجع">
      {report.valuationMarks.map(mark => (
        <li key={mark.id} className={`market-view__mark is-${mark.stance}`}>
          <span>{mark.label}</span>
          <strong>
            {mark.stanceLabel}
            {mark.percentLabel ? <bdi> {mark.percentLabel}</bdi> : null}
          </strong>
        </li>
      ))}
    </ul>
  );
}

function DecisionCard({ decision }: { decision: MarketViewDecision }) {
  return (
    <section className={`market-view__verdict ${decisionTone(decision.kind)}`} aria-label="کارت نتیجه">
      {decision.valuation ? (
        <div className={`market-view__verdict-pane ${valuationTone(decision.valuation.stance)}`}>
          <p className="market-view__verdict-kicker">دید ارزشی</p>
          <div className="market-view__verdict-row">
            <span className="market-view__verdict-dot" aria-hidden="true" />
            <div>
              <h2>{decision.valuation.title}</h2>
              <p>{decision.valuation.detail}</p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="market-view__verdict-pane is-decision">
        <p className="market-view__verdict-kicker">وضعیت تصمیم</p>
        <div className="market-view__verdict-row">
          <div className="market-view__verdict-badge" aria-hidden="true">
            <DecisionIcon kind={decision.kind} />
          </div>
          <div>
            <h2>{decision.title}</h2>
            <p>{decision.reason}</p>
            <p className="market-view__verdict-change"><span>شرایط تغییر:</span> {decision.changeConditions}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onStoreChange);
      return () => mq.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

/**
 * Shared grapheme typing across narrative sections.
 * Starts empty after mount (no full-text flash). Timers cleared on key change / unmount.
 */
function useGraphemeTyping(reportKey: string, totalGraphemes: number, reducedMotion: boolean) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const timers = useRef<number[]>([]);
  const raf = useRef<number | null>(null);
  const shownRef = useRef(0);
  const keyRef = useRef(reportKey);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
    if (raf.current != null) {
      window.cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, []);

  const skip = useCallback(() => {
    clearTimers();
    shownRef.current = totalGraphemes;
    setShown(totalGraphemes);
    setTyping(false);
    setReady(true);
  }, [clearTimers, totalGraphemes]);

  useEffect(() => {
    clearTimers();
    keyRef.current = reportKey;
    shownRef.current = 0;
    if (reducedMotion || totalGraphemes === 0) {
      shownRef.current = totalGraphemes;
      setShown(totalGraphemes);
      setTyping(false);
      setReady(true);
      return;
    }
    // Hydration-safe: stay empty until this effect — never paint full text then wipe.
    setShown(0);
    setTyping(true);
    setReady(true);
    const interval = Math.max(30, typingIntervalMs(totalGraphemes));
    let last = performance.now();
    const step = (now: number) => {
      if (keyRef.current !== reportKey) return;
      if (now - last < interval) {
        raf.current = window.requestAnimationFrame(step);
        return;
      }
      last = now;
      const next = Math.min(totalGraphemes, shownRef.current + 1);
      shownRef.current = next;
      setShown(next);
      if (next >= totalGraphemes) {
        setTyping(false);
        return;
      }
      raf.current = window.requestAnimationFrame(step);
    };
    timers.current.push(window.setTimeout(() => {
      last = performance.now();
      raf.current = window.requestAnimationFrame(step);
    }, 400));
    return () => clearTimers();
  }, [reportKey, totalGraphemes, reducedMotion, clearTimers]);

  return { shown, typing, ready, skip, totalGraphemes };
}

function NarrativeBlock({
  sections,
  reportKey,
}: {
  sections: NarrativeSection[];
  reportKey: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { graphemes } = flattenNarrativeGraphemes(sections);
  const { shown, typing, ready, skip, totalGraphemes } = useGraphemeTyping(reportKey, graphemes.length, reduced);
  const bodies = visibleBodiesAt(sections, shown);
  const active = activeSectionIndex(sections, shown);
  const complete = !typing && ready && shown >= graphemes.length;

  return (
    <div
      className="market-view__narrative"
      data-typing={typing ? 'on' : 'off'}
      data-ready={ready ? 'yes' : 'no'}
      data-shown={shown}
      data-total={totalGraphemes}
    >
      {/* Always complete for AT; visual layer is aria-hidden while typing */}
      <div className="visually-hidden">
        {sections.map(section => (
          <section key={`a11y-${section.id}`}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <noscript>
        {sections.map(section => (
          <section key={`noscript-${section.id}`} className="market-view__block">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </noscript>
      <div aria-hidden={typing || !complete ? true : undefined}>
        {sections.map((section, index) => {
          const body = bodies[index] ?? '';
          const started = body.length > 0 || (index === 0 && ready);
          const isActive = typing && index === active && body.length < section.body.length;
          if (!started && index > 0) return null;
          return (
            <section key={section.id} className="market-view__block market-view__typed is-in">
              <h2>{section.title}</h2>
              <p>
                {body}
                {isActive ? <span className="market-view__caret" aria-hidden="true" /> : null}
              </p>
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

function buildNarrative(report: MarketViewReport): NarrativeSection[] {
  const sections: NarrativeSection[] = [
    { id: 'view', title: 'دید فعلی', body: report.summaryLines[0] },
    { id: 'reason', title: 'دلیل', body: report.marketSays },
  ];
  if (report.access === 'full' && report.reading) {
    sections.push({ id: 'meaning', title: 'معنی', body: report.reading });
  }
  if (report.access === 'full' && report.conclusion) {
    sections.push({ id: 'result', title: 'نتیجه', body: report.conclusion });
  } else if (report.access === 'preview') {
    sections.push({ id: 'gate', title: 'ادامه', body: report.summaryLines[1] });
  }
  return sections;
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

  // Fingerprint + symbol + access only — theme/poll/rerender must not restart typing.
  const reportKey = `${report.snapshotFingerprint}:${report.symbol ?? 'all'}:${report.access}`;
  const narrative = buildNarrative(report);

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
            قیمت تابلو {report.currentQuote.label}: <bdi>{report.currentQuote.price}</bdi> / {report.currentQuote.unit}
          </p>
        ) : null}
      </header>

      <div className="market-view__stage">
        <div className="market-view__watermark" aria-hidden="true">
          <span className="brand-mark"><Activity size={200} /></span>
          <span>زرسیگنال</span>
        </div>

        <NarrativeBlock sections={narrative} reportKey={reportKey} />

        <ValuationChips report={report} />

        {report.access === 'full' ? (
          <DecisionCard decision={report.decision} />
        ) : (
          <aside className="market-view__gate" aria-label="پیش‌نمایش تحلیل">
            <DecisionCard decision={report.decision} />
            <p>برداشت کامل و وضعیت تصمیم با پلن دارای دسترسی تحلیل یا دورهٔ آزمایش باز می‌شود. قیمت و خلاصهٔ شواهد رایگان است.</p>
            <div className="market-view__gate-actions">
              <Link className="button" href="/pricing">مشاهده پلن‌ها <ArrowUpLeft size={15} /></Link>
              {trialCta}
            </div>
          </aside>
        )}
      </div>

      {report.evidence.length > 0 ? (
        <details className="market-view__details is-compact">
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

      <details className="market-view__details is-compact">
        <summary>اعتبار داده و محدودیت‌ها</summary>
        <ul className="market-view__list">{report.unconfirmed.map(item => <li key={item}>{item}</li>)}</ul>
      </details>

      {report.changeFromPrior ? (
        <section className="market-view__block">
          <h2>از گزارش قبل چه تغییری کرده؟</h2>
          <p>{report.changeFromPrior}</p>
        </section>
      ) : null}

      <details className="market-view__details is-compact">
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
