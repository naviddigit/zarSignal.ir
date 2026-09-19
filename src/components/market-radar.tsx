'use client';

import { useEffect, useState } from 'react';
import { Activity, Lock } from 'lucide-react';
import type { LiveBubbleCard } from '@/lib/bubbles';

type Focus = 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE';

const order: Focus[] = ['GOLD_BUBBLE', 'SILVER_BUBBLE', 'USD_BUBBLE'];
const meta: Record<Focus, { label: string; token: string; className: string; locked?: boolean }> = {
  GOLD_BUBBLE: { label: 'حباب طلا', token: 'Au', className: 'token-gold' },
  SILVER_BUBBLE: { label: 'حباب نقره', token: 'Ag', className: 'token-silver', locked: true },
  USD_BUBBLE: { label: 'فاصله دلار', token: '$', className: 'token-dollar' },
};

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

export function MarketRadar({ bubbles }: { bubbles: LiveBubbleCard[] }) {
  const [focus, setFocus] = useState<Focus>('GOLD_BUBBLE');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setFocus(current => order[(order.indexOf(current) + 1) % order.length]);
    }, 4200);
    return () => window.clearInterval(id);
  }, [paused]);

  const card = bubbles.find(item => item.key === focus);
  const info = meta[focus];
  const locked = Boolean(info.locked || card?.status === 'blocked');
  const ready = !locked && card && (card.status === 'ok' || card.status === 'stale') && card.percent != null;

  return (
    <div
      className={`radar-art radar-live focus-${focus.toLowerCase()}`}
      aria-label="رادار حباب بازار"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="radar-grid" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="orbit orbit-three" />
      <div className="radar-ray" />
      <span className="radar-label label-top">BUBBLE RADAR</span>
      <span className="radar-label label-bottom">LIVE SWITCH</span>

      <div className="radar-center" key={focus} aria-live="polite">
        <Activity size={22} aria-hidden />
        <strong>{info.label}</strong>
        <b className={`radar-bubble-value ${ready ? (card!.percent! >= 0 ? 'is-up' : 'is-down') : locked ? 'is-locked' : ''}`}>
          {ready ? formatPercent(card!.percent!) : locked ? <><Lock size={16} aria-hidden /> قفل</> : '—'}
        </b>
        <small>
          {ready
            ? (card!.status === 'stale' ? 'داده کمی قدیمی · سیگنال معامله نیست' : 'محاسبه‌شده · سیگنال معامله نیست')
            : locked
              ? 'با اشتراک پریمیوم باز می‌شود'
              : card?.reason ?? 'در انتظار داده'}
        </small>
      </div>

      {order.map(key => {
        const item = meta[key];
        const itemCard = bubbles.find(bubble => bubble.key === key);
        const itemLocked = Boolean(item.locked || itemCard?.status === 'blocked');
        return (
          <button
            key={key}
            type="button"
            className={`radar-token ${item.className} ${focus === key ? 'is-active' : ''} ${itemLocked ? 'is-locked' : ''}`}
            aria-pressed={focus === key}
            onClick={() => { setFocus(key); setPaused(true); }}
          >
            {item.token}
            <small>{item.label.replace('حباب ', '').replace('فاصله ', '')}</small>
          </button>
        );
      })}

      <div className="radar-caption"><span className="status-dot" /> انتخاب نماد · نمایش حباب در مرکز</div>
    </div>
  );
}
