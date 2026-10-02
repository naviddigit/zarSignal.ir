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
import type { MarketViewDecision, MarketViewReport, MarketViewValuationStance } from '@/lib/market-view-report';
import { buildAnalysisNarrativeSections, formatFaPercent, formatTehranStamp } from '@/lib/market-view-report';
import {
  activeSectionIndex,
  flattenNarrativeGraphemes,
  readStoredTypeSpeed,
  storeTypeSpeed,
  visibleAtomsAt,
  type AnalysisTypeSpeed,
  type MetricTone,
  type NarrativeAtom,
  type NarrativeSection,
} from '@/lib/market-view-typing';
import {
  isRevealStepActive,
  isRevealStepMounted,
  type RevealPlanStep,
} from '@/lib/analysis-reveal';
import {
  defaultAnalysisReadingSettings,
  effectiveTypingCps,
  readingSpeedLabel,
  type AnalysisReadingSettings,
} from '@/lib/analysis-reading-settings';
import { canOfferConfirmationWatch } from '@/lib/analysis-engine-status';
import { AnalysisEngagementPanel } from '@/components/analysis-engagement';

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
  if (kind === 'needs_confirmation') return 'is-pending';
  if (kind === 'insufficient_data' || kind === 'analysis_inactive') return 'is-empty';
  return 'is-pending';
}

function valuationTone(stance: MarketViewValuationStance) {
  if (stance === 'below') return 'is-below';
  if (stance === 'above') return 'is-above';
  if (stance === 'equal') return 'is-equal';
  if (stance === 'mixed') return 'is-mixed';
  return 'is-unknown';
}

function metricClass(tone: MetricTone) {
  return `market-view__metric is-${tone}`;
}

function MetricSpan({ atom }: { atom: Extract<NarrativeAtom, { kind: 'metric' }> }) {
  const arrow = atom.arrow === 'up' ? '↑' : atom.arrow === 'down' ? '↓' : null;
  return (
    <bdi className={metricClass(atom.tone)}>
      {arrow ? <span aria-hidden="true">{arrow}</span> : null}
      {atom.text}
    </bdi>
  );
}

function renderAtoms(atoms: NarrativeAtom[]) {
  return atoms.map((atom, index) => (
    atom.kind === 'metric'
      ? <MetricSpan key={`m-${index}`} atom={atom} />
      : <span key={`t-${index}`}>{atom.text}</span>
  ));
}

/** Minimal result: market once, valuation once, decision once — no invented overall %. */
function ResultCard({ report }: { report: MarketViewReport }) {
  const decision = report.decision;
  const valuation = decision.valuation;
  const isOverall = Boolean(valuation && valuation.marketLabel === 'بازار' && valuation.percent == null);
  const marketName = isOverall
    ? valuation!.title
    : valuation?.marketLabel
      ?? (report.symbol ? report.title.replace(/^تحلیل\s+/, '') : 'بازار');
  const percentLabel = valuation?.percent != null
    ? `${formatFaPercent(valuation.percent)}٪`
    : null;
  const showUnknownRef = valuation?.stance === 'unknown' && !isOverall;

  return (
    <section className={`market-view__result ${decisionTone(decision.kind)}`} aria-label="کارت نتیجه">
      <p className="market-view__result-market">{marketName}</p>
      {valuation ? (
        <div className={`market-view__result-value ${valuationTone(valuation.stance)}`}>
          <span className="market-view__result-dot" aria-hidden="true" />
          <div>
            {isOverall || valuation.stance === 'mixed' ? (
              <p className="market-view__result-takeaway">{valuation.detail}</p>
            ) : percentLabel ? (
              <p className="market-view__result-percent">
                <bdi className={metricClass(valuation.stance === 'below' ? 'below' : valuation.stance === 'above' ? 'above' : 'neutral')}>
                  {percentLabel}
                </bdi>
                <span> نسبت به مرجع محاسباتی</span>
              </p>
            ) : showUnknownRef ? (
              <p className="market-view__result-percent">
                <bdi className={metricClass('missing')}>مرجع نامشخص</bdi>
              </p>
            ) : (
              <p className="market-view__result-percent">
                <span>{valuation.title.split('·').pop()?.trim()}</span>
                <span> نسبت به مرجع محاسباتی</span>
              </p>
            )}
            <p className="market-view__result-trend">
              <bdi className={metricClass(report.trend.status === 'ready' ? 'neutral' : 'missing')}>
                {report.trend.label}
              </bdi>
              {report.trend.detail ? <span> · {report.trend.detail}</span> : null}
            </p>
          </div>
        </div>
      ) : (
        <p className="market-view__result-stance">دید ارزشی در دسترس نیست</p>
      )}
      <div className="market-view__result-decision">
        <p className="market-view__result-kicker">وضعیت تصمیم</p>
        <p className={`market-view__result-decision-title${decision.kind === 'needs_confirmation' ? ' is-caution' : ''}`}>
          {decision.title}
        </p>
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
  speed: AnalysisTypeSpeed,
  reading: AnalysisReadingSettings,
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
  const speedRef = useRef(speed);
  const readingRef = useRef(reading);
  const progressRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  speedRef.current = speed;
  readingRef.current = reading;

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
    progressRef.current = 0;
    completedRef.current = false;
    if (!enabled) {
      setShown(0);
      setTyping(false);
      setReady(false);
      return;
    }
    if (reducedMotion || totalGraphemes === 0) {
      shownRef.current = totalGraphemes;
      progressRef.current = totalGraphemes;
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
    let last = performance.now();
    const step = (now: number) => {
      if (keyRef.current !== stepKey) return;
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      // Effective CPS from settings + 1×/2×; speedRef so mid-type changes do not restart.
      const cps = effectiveTypingCps(readingRef.current, speedRef.current);
      progressRef.current += dt * cps;
      const next = Math.min(totalGraphemes, Math.floor(progressRef.current));
      if (next !== shownRef.current) {
        shownRef.current = next;
        setShown(next);
      }
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
    // reading/speed are read via refs so mid-type admin/user changes continue from the same grapheme
  }, [stepKey, totalGraphemes, reducedMotion, enabled, clearTimers]);

  return { shown, typing, ready, totalGraphemes };
}

function useTypeSpeed(): [AnalysisTypeSpeed, (next: AnalysisTypeSpeed) => void] {
  const [speed, setSpeed] = useState<AnalysisTypeSpeed>(1);
  useEffect(() => {
    setSpeed(readStoredTypeSpeed());
  }, []);
  const update = useCallback((next: AnalysisTypeSpeed) => {
    setSpeed(next);
    storeTypeSpeed(next);
  }, []);
  return [speed, update];
}

function resolveFollowTarget(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  if (root.matches('[data-follow-anchor]')) return root;
  const nested = root.querySelector('[data-follow-anchor]');
  return nested instanceof HTMLElement ? nested : root;
}

function useReadingFollow(
  enabled: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  reportKey: string,
  reducedMotion: boolean,
  /** Rebind ResizeObserver whenever the active DOM follow target changes. */
  targetKey: string,
) {
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);
  const programmatic = useRef(false);
  const lastY = useRef(0);
  const raf = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const lastAlignH = useRef(0);
  const observedEl = useRef<HTMLElement | null>(null);

  const setFollow = useCallback((next: boolean) => {
    followingRef.current = next;
    setFollowing(next);
  }, []);

  useEffect(() => {
    setFollow(true);
    lastY.current = window.scrollY;
    lastAlignH.current = 0;
    observedEl.current = null;
  }, [reportKey, setFollow]);

  const align = useCallback((smooth: boolean) => {
    if (reducedMotion || !followingRef.current) return;
    const target = resolveFollowTarget(anchorRef.current);
    if (!target) return;
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
    // Resize-driven settles use auto to avoid smooth-scroll ↔ layout feedback loops.
    window.scrollBy({ top: delta, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
    lastY.current = window.scrollY;
    window.setTimeout(() => { programmatic.current = false; }, smooth && !reducedMotion ? 320 : 80);
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

  // Observe the *active* follow target; reconnect when targetKey changes.
  // Loop prevention: ignore while programmatic, debounce, height threshold — no global align cap.
  useEffect(() => {
    if (!enabled || reducedMotion) return;
    if (typeof ResizeObserver === 'undefined') return;

    let ro: ResizeObserver | null = null;
    let cancelled = false;

    const bind = () => {
      if (cancelled) return;
      const target = resolveFollowTarget(anchorRef.current);
      if (!target) return;
      if (observedEl.current === target && ro) return;
      ro?.disconnect();
      observedEl.current = target;
      lastAlignH.current = target.getBoundingClientRect().height;
      ro = new ResizeObserver(entries => {
        if (!followingRef.current || programmatic.current) return;
        const h = entries[0]?.contentRect.height ?? 0;
        if (Math.abs(h - lastAlignH.current) < 8) return;
        if (settleTimer.current != null) window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => {
          if (!followingRef.current || programmatic.current) return;
          lastAlignH.current = h;
          scheduleAlign(false);
        }, 120);
      });
      ro.observe(target);
      scheduleAlign(false);
    };

    // Callback refs may assign after paint; retry once next frame.
    bind();
    const retry = window.requestAnimationFrame(bind);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(retry);
      ro?.disconnect();
      observedEl.current = null;
      if (settleTimer.current != null) window.clearTimeout(settleTimer.current);
    };
  }, [anchorRef, enabled, reducedMotion, scheduleAlign, reportKey, targetKey]);

  useEffect(() => {
    const onScroll = () => {
      if (programmatic.current) {
        lastY.current = window.scrollY;
        return;
      }
      const y = window.scrollY;
      // Only intentional upward scroll breaks follow — not programmatic auto-align.
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
      if (target.closest('[data-follow-resume],[data-follow-keep]')) return;
      // Feedback form interaction stops follow; mounting the form does not.
      if (target.closest('.market-view__feedback button, .market-view__feedback input, .market-view__feedback textarea, .market-view__feedback label')) {
        if (followingRef.current) setFollow(false);
        return;
      }
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
  const atomGroups = visibleAtomsAt(sections, shown);
  const bodies = atomGroups.map(atoms => atoms.map(a => a.text).join(''));
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
          const atoms = atomGroups[index] ?? [];
          const started = body.length > 0 || (index === 0 && ready);
          const isActive = typing && index === active && body.length < section.body.length;
          if (!started && index > 0) return null;
          return (
            <section
              key={section.id}
              className="market-view__block market-view__typed is-in"
              ref={attachEndRef && index === active ? endRef : undefined}
              data-follow-anchor={attachEndRef && index === active ? '' : undefined}
            >
              <h2>{section.title}</h2>
              <p>
                {renderAtoms(atoms)}
                {isActive ? <span className="market-view__caret" aria-hidden="true" /> : null}
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
  return buildAnalysisNarrativeSections(report);
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
            {report.evidence.map(row => {
              const missing = row.diffPercent == null || row.status === 'unavailable' || row.status === 'blocked';
              const tone: MetricTone = missing
                ? 'missing'
                : row.diffPercent! < 0
                  ? 'below'
                  : row.diffPercent! > 0
                    ? 'above'
                    : 'neutral';
              const reason = row.statusReason;
              const missingLabel = reason ?? 'قیمت موجود نیست';
              return (
                <tr key={row.id} className={row.status !== 'ok' ? 'is-muted' : undefined}>
                  <th scope="row"><strong>{row.marketLabel}</strong></th>
                  <td data-label="قیمت بازار">
                    {row.marketPriceLabel
                      ? <bdi className={metricClass('neutral')}>{row.marketPriceLabel}</bdi>
                      : <bdi className={metricClass('missing')}>{missingLabel}</bdi>}
                  </td>
                  <td data-label="مرجع محاسباتی">
                    {row.referenceLabel
                      ? <bdi className={metricClass('neutral')}>{row.referenceLabel}</bdi>
                      : <bdi className={metricClass('missing')}>
                          {row.id === 'coin' && row.marketPriceLabel
                            ? 'مرجع محاسباتی سکه فعلاً فعال نیست'
                            : reason && /مرجع|فعال نیست/.test(reason)
                              ? reason
                              : 'مرجع محاسباتی فعال نیست'}
                        </bdi>}
                  </td>
                  <td data-label="اختلاف">
                    {row.diffPercent != null
                      ? <bdi className={metricClass(tone)}>{formatFaPercent(row.diffPercent)}٪</bdi>
                      : <bdi className={metricClass('missing')}>{missingLabel}</bdi>}
                    {row.status !== 'ok' && reason ? (
                      <small>{reason}</small>
                    ) : null}
                  </td>
                </tr>
              );
            })}
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
  plan?: {
    level: import('@/lib/capabilities').AccessLevel | null;
    label: string | null;
    status: 'فعال' | 'آزمایشی' | 'رایگان' | 'در انتظار پرداخت' | null;
  },
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
    node: (
      <AnalysisEngagementPanel
        report={report}
        signedIn={signedIn}
        planLevel={plan?.level ?? null}
        planLabel={plan?.label ?? null}
        planStatus={plan?.status ?? null}
      />
    ),
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
  planLevel = null,
  planLabel = null,
  planStatus = null,
  readingSettings = defaultAnalysisReadingSettings,
}: {
  initial: MarketViewReport;
  canRefresh: boolean;
  trialCta?: ReactNode;
  pageExtras?: ReactNode;
  signedIn?: boolean;
  planLevel?: import('@/lib/capabilities').AccessLevel | null;
  planLabel?: string | null;
  planStatus?: 'فعال' | 'آزمایشی' | 'رایگان' | 'در انتظار پرداخت' | null;
  readingSettings?: AnalysisReadingSettings;
}) {
  const [report, setReport] = useState(initial);
  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const [typeSpeed, setTypeSpeed] = useTypeSpeed();
  const endRef = useRef<HTMLElement | null>(null);
  const reading = readingSettings;

  const reportKey = `${report.snapshotFingerprint}:${report.symbol ?? 'all'}:${report.access}`;
  const { items: plan } = useMemo(
    () => buildRevealPlan(report, trialCta, pageExtras, signedIn, {
      level: planLevel,
      label: planLabel,
      status: planStatus,
    }),
    [report, trialCta, pageExtras, signedIn, planLevel, planLabel, planStatus],
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
    typeSpeed,
    reading,
    onTypeComplete,
  );

  // Fade steps advance after the admin-configured section appear delay.
  useEffect(() => {
    clearFade();
    if (reduced) {
      setActiveIndex(plan.length);
      return;
    }
    if (!activeStep || activeStep.kind !== 'fade') return;
    fadeTimer.current = window.setTimeout(() => {
      advance();
    }, reading.sectionAppearMs);
    return () => clearFade();
  }, [activeIndex, activeStep, reduced, plan.length, advance, clearFade, reportKey, reading.sectionAppearMs]);

  // Keep follow alive after the last fade so feedback / scores can settle into view.
  const followEnabled = !reduced;
  const revealDone = activeIndex >= plan.length;
  const followTargetKey = `${reportKey}:${activeIndex}:${activeStep?.id ?? 'done'}:${revealDone ? 'done' : 'run'}`;
  const { following, resume, scheduleAlign } = useReadingFollow(
    followEnabled,
    endRef,
    reportKey,
    reduced,
    followTargetKey,
  );

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
        {!reduced ? (
          <div className="market-view__speed" role="group" aria-label={readingSpeedLabel(reading, typeSpeed)} data-follow-keep>
            <span>{readingSpeedLabel(reading, typeSpeed)}</span>
            <button
              type="button"
              className={typeSpeed === 1 ? 'is-active' : undefined}
              aria-pressed={typeSpeed === 1}
              title={`${Math.round(effectiveTypingCps(reading, 1))} نویسه/ثانیه`}
              data-follow-keep
              onClick={() => setTypeSpeed(1)}
            >
              ۱×
            </button>
            <button
              type="button"
              className={typeSpeed === 2 ? 'is-active' : undefined}
              aria-pressed={typeSpeed === 2}
              title={`${Math.round(effectiveTypingCps(reading, 2))} نویسه/ثانیه`}
              data-follow-keep
              onClick={() => setTypeSpeed(2)}
            >
              ۲×
            </button>
          </div>
        ) : null}
        {report.currentQuote ? (
          <p className="market-view__meta">
            قیمت تابلو {report.currentQuote.label}:{' '}
            <bdi className={metricClass('neutral')}>{report.currentQuote.price}</bdi>
            {' / '}{report.currentQuote.unit}
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
            const stepRevealDone = activeIndex >= plan.length;
            // Keep follow target on engagement after the last fade advances so feedback/scores settle.
            const keepEngagementFollow = item.id === 'engagement'
              && following
              && (activeFade || stepRevealDone || activeIndex > index);
            const attachFadeFollow = activeFade || keepEngagementFollow;
            return (
              <RevealItem key={item.id}>
                <div
                  ref={
                    attachFadeFollow
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
