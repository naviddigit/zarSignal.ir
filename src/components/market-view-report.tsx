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
import { Activity, ArrowUpLeft, ChevronDown, RefreshCw } from 'lucide-react';
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
  REVEAL_FADE_MS,
  isRevealStepActive,
  isRevealStepMounted,
  type RevealPlanStep,
} from '@/lib/analysis-reveal';
import { canOfferConfirmationWatch } from '@/lib/analysis-engine-status';
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
  if (kind === 'insufficient_data' || kind === 'analysis_inactive') return 'is-empty';
  return 'is-pending';
}

function valuationTone(stance: NonNullable<MarketViewDecision['valuation']>['stance']) {
  if (stance === 'below') return 'is-below';
  if (stance === 'above') return 'is-above';
  if (stance === 'equal') return 'is-equal';
  return 'is-unknown';
}

/** Minimal result: market once, valuation % once, decision once — no comparative prose repeat. */
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
      <p className="market-view__result-market">{marketName}</p>
      {valuation ? (
        <div className={`market-view__result-value ${valuationTone(valuation.stance)}`}>
          <span className="market-view__result-dot" aria-hidden="true" />
          <p className="market-view__result-percent">
            {percentLabel ? <bdi>{percentLabel}</bdi> : <span>{valuation.stance === 'unknown' ? 'مرجع نامشخص' : valuation.title.split('·').pop()?.trim()}</span>}
            <span> نسبت به مرجع محاسباتی</span>
          </p>
        </div>
      ) : (
        <p className="market-view__result-stance">دید ارزشی در دسترس نیست</p>
      )}
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

function useGraphemeTyping(
  stepKey: string,
  totalGraphemes: number,
  reducedMotion: boolean,
  enabled: boolean,
  onComplete: () => void,
) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const timers = useRef<number[]>([]);
  const raf = useRef<number | null>(null);
  const shownRef = useRef(0);
  const keyRef = useRef(stepKey);
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
    keyRef.current = stepKey;
    shownRef.current = 0;
    completedRef.current = false;
    if (!enabled) {
      setShown(0);
      setTyping(false);
      setReady(false);
      return;
    }
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
      if (keyRef.current !== stepKey) return;
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
    }, 280));
    return () => clearTimers();
  }, [stepKey, totalGraphemes, reducedMotion, enabled, clearTimers]);

  return { shown, typing, ready, totalGraphemes };
}

function useReadingFollow(
  enabled: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  reportKey: string,
  reducedMotion: boolean,
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

  const align = useCallback((smooth: boolean) => {
    if (reducedMotion || !followingRef.current || !anchorRef.current) return;
    const root = anchorRef.current;
    const nested = root.matches('[data-follow-anchor]')
      ? root
      : root.querySelector('[data-follow-anchor]');
    const target = (nested instanceof HTMLElement ? nested : root);
    const rect = target.getBoundingClientRect();
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
    window.scrollBy({ top: delta, behavior: smooth ? 'smooth' : 'auto' });
    lastY.current = window.scrollY;
    window.setTimeout(() => { programmatic.current = false; }, smooth ? 320 : 80);
  }, [anchorRef, reducedMotion]);

  const scheduleAlign = useCallback((smooth = false) => {
    if (!enabled || reducedMotion || !followingRef.current) return;
    if (raf.current != null) return;
    raf.current = window.requestAnimationFrame(() => {
      raf.current = null;
      align(smooth);
    });
  }, [align, enabled, reducedMotion]);

  useEffect(() => {
    if (!enabled) return;
    scheduleAlign(false);
  }, [enabled, scheduleAlign]);

  useEffect(() => {
    const onScroll = () => {
      if (programmatic.current) {
        lastY.current = window.scrollY;
        return;
      }
      const y = window.scrollY;
      if (y + 2 < lastY.current && followingRef.current) setFollow(false);
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
      // Mounting/revealing controls is not interaction; only real pointer on controls stops follow.
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
    scheduleAlign(true);
  }, [scheduleAlign, setFollow]);

  return { following, resume, scheduleAlign };
}

function DetailsToggle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="market-view__details is-compact">
      <summary>
        <span className="market-view__details-title">{title}</span>
        <span className="market-view__details-action">
          <span className="market-view__details-closed">مشاهده جزئیات</span>
          <span className="market-view__details-open">بستن جزئیات</span>
          <ChevronDown className="market-view__details-chevron" size={18} strokeWidth={2.2} aria-hidden />
        </span>
      </summary>
      {children}
    </details>
  );
}

function NarrativeBlock({
  sections,
  shown,
  typing,
  ready,
  totalGraphemes,
  endRef,
  attachEndRef,
}: {
  sections: NarrativeSection[];
  shown: number;
  typing: boolean;
  ready: boolean;
  totalGraphemes: number;
  endRef: RefObject<HTMLElement | null>;
  attachEndRef: boolean;
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
                {attachEndRef && index === active ? (
                  <span ref={endRef} className="market-view__read-anchor" aria-hidden="true" />
                ) : null}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function RevealItem({ children }: { children: ReactNode }) {
  return <div className="market-view__reveal is-in">{children}</div>;
}

function buildMainNarrative(report: MarketViewReport): NarrativeSection[] {
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

type PlanItem =
  | { id: string; kind: 'type'; sections: NarrativeSection[] }
  | { id: string; kind: 'fade'; node: ReactNode };

function EvidenceTable({ report }: { report: MarketViewReport }) {
  return (
    <DetailsToggle title="جدول شواهد و اختلاف با مرجع">
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
    </DetailsToggle>
  );
}

function buildRevealPlan(
  report: MarketViewReport,
  trialCta: ReactNode | undefined,
  pageExtras: ReactNode | undefined,
  signedIn: boolean,
): { items: PlanItem[]; meta: RevealPlanStep[] } {
  const items: PlanItem[] = [];

  items.push({ id: 'narrative', kind: 'type', sections: buildMainNarrative(report) });

  items.push({
    id: 'outcome',
    kind: 'fade',
    node: report.access === 'full' ? (
      <ResultCard report={report} />
    ) : (
      <aside className="market-view__gate" aria-label="پیش‌نمایش تحلیل">
        <ResultCard report={report} />
        <p>برداشت کامل با پلن دارای دسترسی تحلیل یا دورهٔ آزمایش باز می‌شود. قیمت و خلاصهٔ شواهد رایگان است.</p>
        <div className="market-view__gate-actions">
          <Link className="button" href="/pricing">مشاهده پلن‌ها <ArrowUpLeft size={15} /></Link>
          {trialCta}
        </div>
      </aside>
    ),
  });

  if (report.evidence.length > 0) {
    items.push({ id: 'evidence-table', kind: 'fade', node: <EvidenceTable report={report} /> });
  }

  items.push({
    id: 'limits-details',
    kind: 'fade',
    node: (
      <DetailsToggle title="اعتبار داده و محدودیت‌ها">
        <ul className="market-view__list">{report.unconfirmed.map(item => <li key={item}>{item}</li>)}</ul>
      </DetailsToggle>
    ),
  });

  if (report.changeFromPrior) {
    items.push({
      id: 'prior-intro',
      kind: 'type',
      sections: [{
        id: 'prior-intro',
        title: 'از گزارش قبل',
        body: report.changeFromPrior,
      }],
    });
  }

  items.push({
    id: 'formula-details',
    kind: 'fade',
    node: (
      <DetailsToggle title="فرمول و نسخه">
        <ul className="market-view__list">
          {report.evidence.map(row => (
            <li key={row.id}>{row.marketLabel}: {row.referenceBasis}. {row.unitNote}</li>
          ))}
          {report.details.formulaNotes.map(note => <li key={note}>{note}</li>)}
        </ul>
        <p className="market-view__disclaimer">{report.details.disclaimer}</p>
        <p className="market-view__meta">شناسه گزارش: <bdi dir="ltr">{report.reportId}</bdi></p>
      </DetailsToggle>
    ),
  });

  if (pageExtras) {
    items.push({ id: 'page-extras', kind: 'fade', node: <div className="market-view__page-extras">{pageExtras}</div> });
  }

  items.push({
    id: 'engagement',
    kind: 'fade',
    node: <AnalysisEngagementPanel report={report} signedIn={signedIn} />,
  });

  void canOfferConfirmationWatch(report.symbol);

  return {
    items,
    meta: items.map(item => ({ id: item.id, kind: item.kind })),
  };
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
  pageExtras?: ReactNode;
  signedIn?: boolean;
}) {
  const [report, setReport] = useState(initial);
  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const endRef = useRef<HTMLElement | null>(null);

  const reportKey = `${report.snapshotFingerprint}:${report.symbol ?? 'all'}:${report.access}`;
  const { items: plan } = useMemo(
    () => buildRevealPlan(report, trialCta, pageExtras, signedIn),
    [report, trialCta, pageExtras, signedIn],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const fadeTimer = useRef<number | null>(null);

  const clearFade = useCallback(() => {
    if (fadeTimer.current != null) {
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (initial.access !== report.access || initial.symbol !== report.symbol) {
      setReport(initial);
      setPendingFingerprint(null);
      return;
    }
    if (initial.snapshotFingerprint !== report.snapshotFingerprint) {
      setPendingFingerprint(initial.snapshotFingerprint);
    }
  }, [initial, report.access, report.symbol, report.snapshotFingerprint]);

  useEffect(() => {
    clearFade();
    setActiveIndex(0);
  }, [reportKey, clearFade]);

  const advance = useCallback(() => {
    setActiveIndex(index => Math.min(plan.length, index + 1));
  }, [plan.length]);

  const activeStep = activeIndex < plan.length ? plan[activeIndex] : null;
  const typingEnabled = Boolean(activeStep && activeStep.kind === 'type' && !reduced);
  const typingSections = activeStep?.kind === 'type' ? activeStep.sections : [];
  const { graphemes: activeGraphemes } = useMemo(
    () => flattenNarrativeGraphemes(typingSections),
    [typingSections],
  );
  const typingKey = `${reportKey}:${activeStep?.id ?? 'done'}:${activeIndex}`;

  const onTypeComplete = useCallback(() => {
    advance();
  }, [advance]);

  const { shown, typing, ready, totalGraphemes } = useGraphemeTyping(
    typingKey,
    activeGraphemes.length,
    reduced,
    typingEnabled,
    onTypeComplete,
  );

  // Fade steps advance only after their own fade window — not an estimate of prior text length.
  useEffect(() => {
    clearFade();
    if (reduced) {
      setActiveIndex(plan.length);
      return;
    }
    if (!activeStep || activeStep.kind !== 'fade') return;
    fadeTimer.current = window.setTimeout(() => {
      advance();
    }, REVEAL_FADE_MS);
    return () => clearFade();
  }, [activeIndex, activeStep, reduced, plan.length, advance, clearFade, reportKey]);

  const followEnabled = activeIndex < plan.length && !reduced;
  const { following, resume, scheduleAlign } = useReadingFollow(followEnabled, endRef, reportKey, reduced);

  useEffect(() => {
    if (typing) scheduleAlign(false);
  }, [shown, typing, scheduleAlign]);

  useEffect(() => {
    if (activeStep?.kind === 'fade') scheduleAlign(true);
  }, [activeIndex, activeStep?.kind, scheduleAlign]);

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

  const phase = activeIndex >= plan.length ? 'done' : activeStep?.kind === 'fade' ? 'fading' : 'typing';
  const showUpdateChip = Boolean(pendingFingerprint) && canRefresh;
  const done = activeIndex >= plan.length;

  return (
    <article
      className="market-view"
      aria-label={report.title}
      data-reveal-phase={phase}
      data-reveal-index={activeIndex}
      data-reveal-total={plan.length}
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
                disabled={pending || !done}
                title={!done ? 'پس از پایان نمایش می‌توانید به‌روز کنید' : undefined}
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

        <noscript>
          {plan.map(item => (
            item.kind === 'type' ? (
              <div key={`ns-${item.id}`}>
                {item.sections.map(section => (
                  <section key={section.id} className="market-view__block">
                    <h2>{section.title}</h2>
                    <p>{section.body}</p>
                  </section>
                ))}
              </div>
            ) : (
              <div key={`ns-${item.id}`}>{item.node}</div>
            )
          ))}
        </noscript>

        <div className="market-view__sequence">
          {plan.map((item, index) => {
            if (!isRevealStepMounted(index, activeIndex, reduced)) return null;
            if (item.kind === 'type') {
              const active = isRevealStepActive(index, activeIndex, reduced);
              const { graphemes } = flattenNarrativeGraphemes(item.sections);
              const full = graphemes.length;
              const localShown = reduced || !active ? full : shown;
              const localTyping = active && typing;
              return (
                <NarrativeBlock
                  key={item.id}
                  sections={item.sections}
                  shown={localShown}
                  typing={localTyping}
                  ready={reduced || !active ? true : ready}
                  totalGraphemes={full}
                  endRef={endRef}
                  attachEndRef={active}
                />
              );
            }
            const activeFade = isRevealStepActive(index, activeIndex, reduced);
            return (
              <RevealItem key={item.id}>
                <div
                  ref={
                    activeFade
                      ? (node: HTMLDivElement | null) => {
                          endRef.current = node;
                        }
                      : undefined
                  }
                  className="market-view__follow-target"
                  data-follow-step={item.id}
                >
                  {item.node}
                </div>
              </RevealItem>
            );
          })}
        </div>
      </div>

      {!following && followEnabled ? (
        <button
          type="button"
          className="market-view__follow-resume"
          data-follow-resume
          onClick={resume}
        >
          ادامهٔ خواندن
        </button>
      ) : null}

      {error ? <p role="alert" className="market-view__meta">{error}</p> : null}

      {canRefresh && done && !pendingFingerprint ? (
        <button type="button" className="market-view__reload text-link" onClick={showFresh} disabled={pending}>
          <RefreshCw size={14} /> بررسی دادهٔ تازه
        </button>
      ) : null}

      {showUpdateChip && done ? (
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
