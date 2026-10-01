'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
  type RefObject,
} from 'react';
import Link from 'next/link';
import { Activity, ArrowUpLeft, RefreshCw } from 'lucide-react';
import type { MarketViewDecision, MarketViewReport } from '@/lib/market-view-report';
import { formatFaPercent, formatTehranStamp } from '@/lib/market-view-report';
import {
  activeSectionIndex,
  flattenNarrativeGraphemes,
  typingIntervalMs,
  visibleBodiesAt,
  type NarrativeSection,
} from '@/lib/market-view-typing';
import {
  AFTERMATH_STEP_GAP_MS,
  visibleAftermathCount,
} from '@/lib/analysis-reveal';
import { AnalysisEngagementPanel } from '@/components/analysis-engagement';
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

/** Single minimal result card — valuation stance kept distinct from trade decision. */
function ResultCard({ report }: { report: MarketViewReport }) {
  const decision = report.decision;
  const valuation = decision.valuation;
  const marketName = valuation?.marketLabel
    ?? (report.symbol ? report.title.replace(/^تحلیل\s+/, '') : 'بازار');
  const percentLabel = valuation?.percent != null
    ? `${formatFaPercent(valuation.percent)}٪`
    : null;

  return (
    <section className={`market-view__result ${decisionTone(decision.kind)}`} aria-label="کارت نتیجه">
      <div className="market-view__result-head">
        <p className="market-view__result-market">{marketName}</p>
        {valuation ? (
          <div className={`market-view__result-value ${valuationTone(valuation.stance)}`}>
            <span className="market-view__result-dot" aria-hidden="true" />
            <div>
              <p className="market-view__result-stance">{valuation.title}</p>
              {percentLabel ? (
                <p className="market-view__result-percent">
                  <bdi>{percentLabel}</bdi>
                  <span> نسبت به مرجع محاسباتی</span>
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="market-view__result-stance">دید ارزشی در دسترس نیست</p>
        )}
      </div>
      {valuation ? <p className="market-view__result-takeaway">{valuation.detail}</p> : null}
      <div className="market-view__result-decision">
        <p className="market-view__result-kicker">وضعیت تصمیم</p>
        <p className="market-view__result-decision-title">{decision.title}</p>
        <p className="market-view__result-decision-reason">{decision.reason}</p>
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
 * No skip path — reduced-motion and noscript show full text.
 */
function useGraphemeTyping(
  reportKey: string,
  totalGraphemes: number,
  reducedMotion: boolean,
  onComplete: () => void,
) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const timers = useRef<number[]>([]);
  const raf = useRef<number | null>(null);
  const shownRef = useRef(0);
  const keyRef = useRef(reportKey);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
    if (raf.current != null) {
      window.cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimers();
    keyRef.current = reportKey;
    shownRef.current = 0;
    completedRef.current = false;
    if (reducedMotion || totalGraphemes === 0) {
      shownRef.current = totalGraphemes;
      setShown(totalGraphemes);
      setTyping(false);
      setReady(true);
      completedRef.current = true;
      onCompleteRef.current();
      return;
    }
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
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
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

  return { shown, typing, ready, totalGraphemes };
}

/** Keep the active narrative end in view while the reader is following. */
function useReadingFollow(
  enabled: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  reportKey: string,
) {
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);
  const programmatic = useRef(false);
  const lastY = useRef(0);
  const raf = useRef<number | null>(null);

  const setFollow = useCallback((next: boolean) => {
    followingRef.current = next;
    setFollowing(next);
  }, []);

  useEffect(() => {
    setFollow(true);
    lastY.current = window.scrollY;
  }, [reportKey, setFollow]);

  const align = useCallback(() => {
    if (!followingRef.current || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const topPad = 88;
    const bottomPad = window.matchMedia('(max-width: 720px)').matches ? 96 : 32;
    let delta = 0;
    if (rect.bottom > window.innerHeight - bottomPad) {
      delta = rect.bottom - (window.innerHeight - bottomPad);
    } else if (rect.top < topPad) {
      delta = rect.top - topPad;
    }
    if (Math.abs(delta) < 4) return;
    programmatic.current = true;
    window.scrollBy({ top: delta, behavior: 'auto' });
    lastY.current = window.scrollY;
    window.setTimeout(() => { programmatic.current = false; }, 80);
  }, [anchorRef]);

  const scheduleAlign = useCallback(() => {
    if (!enabled || !followingRef.current) return;
    if (raf.current != null) return;
    raf.current = window.requestAnimationFrame(() => {
      raf.current = null;
      align();
    });
  }, [align, enabled]);

  useEffect(() => {
    if (!enabled) return;
    scheduleAlign();
  }, [enabled, scheduleAlign]);

  useEffect(() => {
    const onScroll = () => {
      if (programmatic.current) {
        lastY.current = window.scrollY;
        return;
      }
      const y = window.scrollY;
      if (y + 2 < lastY.current && followingRef.current) {
        setFollow(false);
      }
      lastY.current = y;
    };
    const onSelect = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && followingRef.current) setFollow(false);
    };
    const onPointer = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-follow-resume]')) return;
      if (target.closest('button, a, input, textarea, select, summary, [role="button"]')) {
        if (followingRef.current) setFollow(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('selectionchange', onSelect);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('selectionchange', onSelect);
      document.removeEventListener('pointerdown', onPointer, true);
      if (raf.current != null) window.cancelAnimationFrame(raf.current);
    };
  }, [setFollow]);

  const resume = useCallback(() => {
    setFollow(true);
    scheduleAlign();
  }, [scheduleAlign, setFollow]);

  return { following, resume, scheduleAlign };
}

function NarrativeBlock({
  sections,
  shown,
  typing,
  ready,
  totalGraphemes,
  endRef,
}: {
  sections: NarrativeSection[];
  shown: number;
  typing: boolean;
  ready: boolean;
  totalGraphemes: number;
  endRef: RefObject<HTMLSpanElement | null>;
}) {
  const bodies = visibleBodiesAt(sections, shown);
  const active = activeSectionIndex(sections, shown);
  const complete = !typing && ready && shown >= totalGraphemes;

  return (
    <div
      className="market-view__narrative"
      data-typing={typing ? 'on' : 'off'}
      data-ready={ready ? 'yes' : 'no'}
      data-shown={shown}
      data-total={totalGraphemes}
    >
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
                {index === active ? <span ref={endRef} className="market-view__read-anchor" aria-hidden="true" /> : null}
              </p>
            </section>
          );
        })}
      </div>
      {typing ? (
        <p className="market-view__typing-note">نمایش گزارش آماده · تولید زندهٔ هوش مصنوعی نیست</p>
      ) : null}
    </div>
  );
}

function RevealItem({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  if (!show) return null;
  return <div className="market-view__reveal is-in">{children}</div>;
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
  pageExtras,
  signedIn = false,
}: {
  initial: MarketViewReport;
  canRefresh: boolean;
  trialCta?: ReactNode;
  /** Trial panel, chart, quick links — same reveal source of truth as in-report details. */
  pageExtras?: ReactNode;
  signedIn?: boolean;
}) {
  const [report, setReport] = useState(initial);
  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const endRef = useRef<HTMLSpanElement | null>(null);

  // Fingerprint + symbol + access only — theme/poll/rerender must not restart typing.
  const reportKey = `${report.snapshotFingerprint}:${report.symbol ?? 'all'}:${report.access}`;
  const narrative = useMemo(() => buildNarrative(report), [report]);
  const { graphemes } = useMemo(() => flattenNarrativeGraphemes(narrative), [narrative]);

  const [typingComplete, setTypingComplete] = useState(false);
  const [aftermathStep, setAftermathStep] = useState(0);
  const aftermathTimers = useRef<number[]>([]);

  const clearAftermath = useCallback(() => {
    for (const id of aftermathTimers.current) window.clearTimeout(id);
    aftermathTimers.current = [];
  }, []);

  useEffect(() => {
    // Access/symbol changes apply immediately — animation must not keep private content.
    if (initial.access !== report.access || initial.symbol !== report.symbol) {
      setReport(initial);
      setPendingFingerprint(null);
      return;
    }
    // Fresher snapshot of the same report: never auto-replace mid-read; offer update chip.
    if (initial.snapshotFingerprint !== report.snapshotFingerprint) {
      setPendingFingerprint(initial.snapshotFingerprint);
    }
  }, [initial, report.access, report.symbol, report.snapshotFingerprint]);

  useEffect(() => {
    clearAftermath();
    setTypingComplete(false);
    setAftermathStep(0);
  }, [reportKey, clearAftermath]);

  const onTypingComplete = useCallback(() => {
    setTypingComplete(true);
  }, []);

  const { shown, typing, ready, totalGraphemes } = useGraphemeTyping(
    reportKey,
    graphemes.length,
    reduced,
    onTypingComplete,
  );

  const followEnabled = typing || (typingComplete && aftermathStep > 0 && !reduced);
  const { following, resume, scheduleAlign } = useReadingFollow(followEnabled, endRef, reportKey);

  useEffect(() => {
    if (typing) scheduleAlign();
  }, [shown, typing, scheduleAlign]);

  useEffect(() => {
    if (typingComplete && aftermathStep > 0) scheduleAlign();
  }, [aftermathStep, typingComplete, scheduleAlign]);

  const aftermathItems = useMemo(() => {
    const items: { id: string; node: ReactNode }[] = [];

    items.push({
      id: 'outcome',
      node: report.access === 'full' ? (
        <ResultCard report={report} />
      ) : (
        <aside className="market-view__gate" aria-label="پیش‌نمایش تحلیل">
          <ResultCard report={report} />
          <p>برداشت کامل و وضعیت تصمیم با پلن دارای دسترسی تحلیل یا دورهٔ آزمایش باز می‌شود. قیمت و خلاصهٔ شواهد رایگان است.</p>
          <div className="market-view__gate-actions">
            <Link className="button" href="/pricing">مشاهده پلن‌ها <ArrowUpLeft size={15} /></Link>
            {trialCta}
          </div>
        </aside>
      ),
    });

    items.push({
      id: 'evidence-details',
      node: (
        <div className="market-view__details-stack">
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
        </div>
      ),
    });

    if (pageExtras) {
      items.push({ id: 'page-extras', node: <div className="market-view__page-extras">{pageExtras}</div> });
    }

    items.push({
      id: 'engagement',
      node: <AnalysisEngagementPanel report={report} signedIn={signedIn} />,
    });

    return items;
  }, [report, trialCta, pageExtras, signedIn]);

  const visibleCount = visibleAftermathCount({
    typingComplete,
    step: aftermathStep,
    total: aftermathItems.length,
    reducedMotion: reduced,
  });

  useEffect(() => {
    clearAftermath();
    if (!typingComplete) {
      setAftermathStep(0);
      return;
    }
    if (reduced) {
      setAftermathStep(aftermathItems.length);
      return;
    }
    setAftermathStep(1);
    let step = 1;
    const tick = () => {
      step += 1;
      setAftermathStep(step);
      if (step < aftermathItems.length) {
        aftermathTimers.current.push(window.setTimeout(tick, AFTERMATH_STEP_GAP_MS));
      }
    };
    if (aftermathItems.length > 1) {
      aftermathTimers.current.push(window.setTimeout(tick, AFTERMATH_STEP_GAP_MS));
    }
    return () => clearAftermath();
  }, [typingComplete, reduced, aftermathItems.length, clearAftermath, reportKey]);

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
          // Entitlement expiry must apply immediately — animation must not keep private content.
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

  const phase = !typingComplete ? 'typing' : visibleCount >= aftermathItems.length ? 'done' : 'aftermath';
  const showUpdateChip = Boolean(pendingFingerprint) && canRefresh;

  return (
    <article
      className="market-view"
      aria-label={report.title}
      data-reveal-phase={phase}
      data-aftermath-visible={visibleCount}
    >
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
          {showUpdateChip ? (
            <>
              {' · '}
              <button
                type="button"
                className="market-view__update-chip"
                onClick={showFresh}
                disabled={pending || typing}
                title={typing ? 'پس از پایان خواندن می‌توانید به‌روز کنید' : undefined}
              >
                <RefreshCw size={13} aria-hidden />
                {pending ? 'در حال بارگذاری…' : 'به‌روزرسانی موجود'}
              </button>
            </>
          ) : null}
        </p>
        {report.currentQuote ? (
          <p className="market-view__meta">
            قیمت تابلو {report.currentQuote.label}: <bdi>{report.currentQuote.price}</bdi> / {report.currentQuote.unit}
          </p>
        ) : null}
      </header>

      <div className="market-view__reading">
        <div className="market-view__watermark-slot" aria-hidden="true">
          <div className="market-view__watermark">
            <span className="brand-mark"><Activity size={200} /></span>
            <span>زرسیگنال</span>
          </div>
        </div>
        <NarrativeBlock
          sections={narrative}
          shown={shown}
          typing={typing}
          ready={ready}
          totalGraphemes={totalGraphemes}
          endRef={endRef}
        />
      </div>

      {!following && (typing || (typingComplete && visibleCount < aftermathItems.length)) ? (
        <button
          type="button"
          className="market-view__follow-resume"
          data-follow-resume
          onClick={resume}
        >
          ادامهٔ خواندن
        </button>
      ) : null}

      <div className="market-view__aftermath" data-visible-count={visibleCount}>
        {aftermathItems.map((item, index) => (
          <RevealItem key={item.id} show={index < visibleCount}>
            {item.node}
          </RevealItem>
        ))}
      </div>

      <noscript>
        <ResultCard report={report} />
        {pageExtras}
        <AnalysisEngagementPanel report={report} signedIn={signedIn} />
      </noscript>

      {error ? <p role="alert" className="market-view__meta">{error}</p> : null}

      {canRefresh && visibleCount >= aftermathItems.length && !pendingFingerprint ? (
        <button type="button" className="market-view__reload text-link" onClick={showFresh} disabled={pending}>
          <RefreshCw size={14} /> بررسی دادهٔ تازه
        </button>
      ) : null}

      {showUpdateChip && visibleCount >= aftermathItems.length ? (
        <button
          type="button"
          className="market-view__update-chip is-block"
          onClick={showFresh}
          disabled={pending}
        >
          <RefreshCw size={13} aria-hidden />
          {pending ? 'در حال بارگذاری…' : 'به‌روزرسانی موجود'}
        </button>
      ) : null}
    </article>
  );
}
