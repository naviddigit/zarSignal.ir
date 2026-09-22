'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LiveBubbleCard } from '@/lib/bubbles';

type Focus = 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE';

const order: Focus[] = ['GOLD_BUBBLE', 'SILVER_BUBBLE', 'USD_BUBBLE'];

const meta: Record<Focus, { label: string; short: string; token: string; className: string; tint: string; locked?: boolean }> = {
  GOLD_BUBBLE: { label: 'حباب طلا', short: 'طلا', token: 'Au', className: 'token-gold', tint: 'gold' },
  SILVER_BUBBLE: { label: 'حباب نقره', short: 'نقره', token: 'Ag', className: 'token-silver', tint: 'silver', locked: true },
  USD_BUBBLE: { label: 'فاصله دلار', short: 'دلار', token: '$', className: 'token-dollar', tint: 'dollar' },
};

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

export function MarketRadar({ bubbles }: { bubbles: LiveBubbleCard[] }) {
  const [focus, setFocus] = useState<Focus>('GOLD_BUBBLE');
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setFocus(current => order[(order.indexOf(current) + 1) % order.length]);
      setTick(value => value + 1);
    }, 3400);
    return () => window.clearInterval(id);
  }, [paused]);

  const card = useMemo(() => bubbles.find(item => item.key === focus), [bubbles, focus]);
  const info = meta[focus];
  const locked = Boolean(info.locked || card?.status === 'blocked');
  const ready = !locked && card && (card.status === 'ok' || card.status === 'stale') && card.percent != null;
  const direction = ready ? (card!.percent! >= 0 ? 'up' : 'down') : locked ? 'locked' : 'empty';

  return (
    <div
      className={`radar-pro tint-${info.tint} dir-${direction} ${paused ? 'is-paused' : ''}`}
      aria-label="رادار حباب بازار"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
          key={`${focus}-${tick}`}
          cx="100"
          cy="100"
          r="78"
          fill="none"
          pathLength="100"
          className={`radar-pro__ring-value is-${direction}`}
          style={{ strokeDasharray: 100, strokeDashoffset: ready ? 100 - Math.min(100, Math.abs(card!.percent!) / 12 * 100) : 100 }}
        />
      </svg>

      <div className="radar-pro__center" aria-live="polite" key={focus}>
        <div className="radar-pro__center-beat">
          <span className="radar-pro__eyebrow">{locked ? `${info.short} · قفل` : info.label}</span>
          <strong dir="ltr" className={`radar-pro__value is-${direction}`}>
            {ready ? formatPercent(card!.percent!) : locked ? 'قفل' : '—'}
          </strong>
          <span className="radar-pro__status">
            {ready
              ? card!.status === 'stale'
                ? 'داده قدیمی · سیگنال معامله نیست'
                : 'محاسبه زنده · سیگنال معامله نیست'
              : locked
                ? 'در انتظار مدل محاسباتی تأییدشده'
                : card?.reason ?? 'در انتظار داده'}
          </span>
          <div className="radar-pro__pips" aria-hidden="true">
            {order.map(key => <i key={key} className={key === focus ? 'is-on' : ''} />)}
          </div>
        </div>
      </div>

      {order.map(key => {
        const item = bubbles.find(bubble => bubble.key === key);
        const itemLocked = Boolean(meta[key].locked || item?.status === 'blocked');
        return (
          <button
            key={key}
            type="button"
            className={`radar-pro__token ${meta[key].className} ${focus === key ? 'is-active' : ''} ${itemLocked ? 'is-locked' : ''}`}
            aria-pressed={focus === key}
            aria-label={`${meta[key].short}${itemLocked ? ' قفل' : ''}`}
            onClick={() => { setFocus(key); setPaused(true); }}
          >
            <b>{meta[key].token}</b>
            <small>{meta[key].short}</small>
          </button>
        );
      })}

      <div className="radar-pro__caption">
        <span className="status-dot" />
        چرخش خودکار · کلیک برای تمرکز روی نماد
      </div>
    </div>
  );
}
