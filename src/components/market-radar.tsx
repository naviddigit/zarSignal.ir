'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LiveBubbleCard } from '@/lib/bubbles';

type Focus = 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE';

const order: Focus[] = ['GOLD_BUBBLE', 'SILVER_BUBBLE', 'USD_BUBBLE'];

/** Fixed 120° spacing on one shared circle (gold starts at top). */
const BASE_ANGLES = [-Math.PI / 2, -Math.PI / 2 + (2 * Math.PI) / 3, -Math.PI / 2 + (4 * Math.PI) / 3] as const;
const ORBIT_PERIOD_MS = 48000;

const meta: Record<Focus, { label: string; short: string; token: string; className: string; tint: string; locked?: boolean }> = {
  GOLD_BUBBLE: { label: 'حباب طلا', short: 'طلا', token: 'Au', className: 'tone-gold', tint: 'gold' },
  SILVER_BUBBLE: { label: 'حباب نقره', short: 'نقره', token: 'Ag', className: 'tone-silver', tint: 'silver', locked: true },
  USD_BUBBLE: { label: 'فاصله دلار', short: 'دلار', token: '$', className: 'tone-dollar', tint: 'dollar' },
};

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

function placePlanet(el: HTMLElement, angle: number, radius: number) {
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
}

export function MarketRadar({ bubbles }: { bubbles: LiveBubbleCard[] }) {
  const [focus, setFocus] = useState<Focus>('GOLD_BUBBLE');
  const [paused, setPaused] = useState(false);
  const [automatic, setAutomatic] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const planetRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const radiusRef = useRef(120);
  const angleRef = useRef(0);

  const spinning = automatic && !paused;

  // One shared radius from the radar box — every symbol uses this exact distance.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const applyRadius = (radius: number) => {
      radiusRef.current = radius;
      root.style.setProperty('--orbit-r', `${radius}px`);
      order.forEach((_, index) => {
        const el = planetRefs.current[index];
        if (el) placePlanet(el, angleRef.current + BASE_ANGLES[index], radius);
      });
    };

    const measure = () => {
      const size = Math.min(root.clientWidth, root.clientHeight);
      // Keep planets inside the radar box: radius ≤ half height − half token − padding
      const maxR = Math.max(72, Math.floor(root.clientHeight / 2 - 44));
      applyRadius(Math.round(Math.max(84, Math.min(size * 0.3, maxR, 150))));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // True circular orbit: same ω and same r for Au / Ag / $
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !spinning) {
      order.forEach((_, index) => {
        const el = planetRefs.current[index];
        if (el) placePlanet(el, angleRef.current + BASE_ANGLES[index], radiusRef.current);
      });
      return;
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      angleRef.current = (angleRef.current + (dt / ORBIT_PERIOD_MS) * Math.PI * 2) % (Math.PI * 2);
      const radius = radiusRef.current;
      order.forEach((_, index) => {
        const el = planetRefs.current[index];
        if (el) placePlanet(el, angleRef.current + BASE_ANGLES[index], radius);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinning]);

  // Cycle center content — silver stays in the orbit even when locked.
  useEffect(() => {
    if (!automatic || paused) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setFocus(current => order[(order.indexOf(current) + 1) % order.length]);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [automatic, paused]);

  const card = useMemo(() => bubbles.find(item => item.key === focus), [bubbles, focus]);
  const info = meta[focus];
  const locked = Boolean(info.locked || card?.status === 'blocked');
  const ready = !locked && card && (card.status === 'ok' || card.status === 'stale') && card.percent != null;
  const direction = ready ? (card!.percent! >= 0 ? 'up' : 'down') : locked ? 'locked' : 'empty';

  return (
    <div
      ref={rootRef}
      className={`radar-pro tint-${info.tint} dir-${direction} ${paused || !automatic ? 'is-paused' : ''}`}
      aria-label="رادار حباب بازار"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="radar-pro__glow" />
      <div className="radar-pro__grid" />
      <div className="radar-pro__orbit radar-pro__orbit--a" />
      <div className="radar-pro__orbit radar-pro__orbit--b" />
      <div className="radar-pro__orbit radar-pro__orbit--c" />
      <div className="radar-pro__sweep" />
      <div className="radar-pro__pulse radar-pro__pulse--a" aria-hidden="true" />

      <svg className="radar-pro__ring" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="78" fill="none" className="radar-pro__ring-track" pathLength="100" />
        <circle
          key={focus}
          cx="100"
          cy="100"
          r="78"
          fill="none"
          pathLength="100"
          className={`radar-pro__ring-value is-${direction}`}
          style={{ strokeDasharray: 100, strokeDashoffset: ready ? 100 - Math.min(100, Math.abs(card!.percent!) / 12 * 100) : 100 }}
        />
      </svg>

      <div className="radar-pro__center" aria-live={automatic ? 'off' : 'polite'} key={focus}>
        <div className="radar-pro__center-beat">
          <span className="radar-pro__eyebrow">{locked ? `${info.short} · به‌زودی` : info.label}</span>
          <strong dir="ltr" className={`radar-pro__value is-${direction}`}>
            {ready ? formatPercent(card!.percent!) : '—'}
          </strong>
          <span className="radar-pro__status">
            {ready
              ? (card!.status === 'stale' ? 'داده قدیمی' : 'اختلاف قیمت · سیگنال نیست')
              : locked
                ? 'مدل نقره هنوز فعال نیست'
                : (card?.reason ?? 'در انتظار داده')}
          </span>
          {!locked ? (
            <Link
              className="radar-analysis-link"
              href={`/analysis/${focus === 'GOLD_BUBBLE' ? 'gold_melted' : focus === 'USD_BUBBLE' ? 'usd' : 'silver_999'}`}
            >
              جزئیات ←
            </Link>
          ) : (
            <Link className="radar-analysis-link" href="/analysis/gold_melted">تحلیل طلا ←</Link>
          )}
          <div className="radar-pro__pips" aria-hidden="true">
            {order.map(key => <i key={key} className={key === focus ? 'is-on' : ''} />)}
          </div>
        </div>
      </div>

      <div className="radar-pro__planets">
        {order.map((key, index) => {
          const item = bubbles.find(bubble => bubble.key === key);
          const itemLocked = Boolean(meta[key].locked || item?.status === 'blocked');
          return (
            <button
              key={key}
              ref={el => {
                planetRefs.current[index] = el;
              }}
              type="button"
              className={`radar-pro__token radar-pro__planet radar-pro__planet--${index} ${meta[key].className}${focus === key ? ' is-active' : ''}${itemLocked ? ' is-locked' : ''}`}
              aria-pressed={focus === key}
              aria-label={`${meta[key].short}${itemLocked ? ' به‌زودی' : ''}`}
              onClick={() => {
                setFocus(key);
                setAutomatic(false);
              }}
            >
              <b>{meta[key].token}</b>
              <small>{meta[key].short}</small>
            </button>
          );
        })}
      </div>

      <div className="radar-pro__caption">
        <span className="status-dot" />
        <button
          className="radar-rotation-control"
          type="button"
          aria-pressed={automatic}
          onClick={() => setAutomatic(value => !value)}
        >
          {automatic ? 'توقف چرخش' : 'چرخش خودکار'}
        </button>
      </div>
    </div>
  );
}
