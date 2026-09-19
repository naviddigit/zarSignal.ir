'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import type { LiveBubbleCard } from '@/lib/bubbles';

type Focus = 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE' | 'EUR_LOCK' | 'AED_LOCK' | 'DUBAI_LOCK';

type Node = {
  key: Focus;
  token: string;
  short: string;
  bubbleKey?: LiveBubbleCard['key'];
  locked?: boolean;
  className: string;
};

const nodes: Node[] = [
  { key: 'GOLD_BUBBLE', token: 'Au', short: 'طلا', bubbleKey: 'GOLD_BUBBLE', className: 'is-gold' },
  { key: 'SILVER_BUBBLE', token: 'Ag', short: 'نقره', bubbleKey: 'SILVER_BUBBLE', locked: true, className: 'is-silver' },
  { key: 'USD_BUBBLE', token: '$', short: 'دلار', bubbleKey: 'USD_BUBBLE', className: 'is-dollar' },
  { key: 'EUR_LOCK', token: '€', short: 'یورو', locked: true, className: 'is-euro' },
  { key: 'AED_LOCK', token: 'د.إ', short: 'درهم', locked: true, className: 'is-aed' },
  { key: 'DUBAI_LOCK', token: 'Db', short: 'دبی', locked: true, className: 'is-dubai' },
];

const autoFocus: Focus[] = ['GOLD_BUBBLE', 'USD_BUBBLE', 'SILVER_BUBBLE', 'EUR_LOCK', 'AED_LOCK', 'DUBAI_LOCK'];

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

function ringOffset(percent: number | null) {
  const clamped = percent == null || !Number.isFinite(percent) ? 0 : Math.max(-12, Math.min(12, percent));
  const circumference = 2 * Math.PI * 72;
  return circumference * (1 - Math.abs(clamped) / 12);
}

export function MarketRadar({ bubbles }: { bubbles: LiveBubbleCard[] }) {
  const [focus, setFocus] = useState<Focus>('GOLD_BUBBLE');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setFocus(current => autoFocus[(autoFocus.indexOf(current) + 1) % autoFocus.length]);
    }, 3200);
    return () => window.clearInterval(id);
  }, [paused]);

  const node = nodes.find(item => item.key === focus)!;
  const card = useMemo(
    () => (node.bubbleKey ? bubbles.find(item => item.key === node.bubbleKey) : undefined),
    [bubbles, node.bubbleKey],
  );

  const ready = !node.locked && card && (card.status === 'ok' || card.status === 'stale') && card.percent != null;
  const locked = node.locked || card?.status === 'blocked';
  const direction = ready ? (card!.percent! >= 0 ? 'up' : 'down') : locked ? 'locked' : 'empty';
  const circumference = 2 * Math.PI * 72;
  const title = locked ? `${node.short} · قفل پریمیوم` : node.bubbleKey === 'USD_BUBBLE' ? 'فاصله دلار' : `حباب ${node.short}`;

  return (
    <div
      className={`radar-orbit tint-${node.className.replace('is-', '')} dir-${direction}`}
      aria-label="رادار حباب بازار"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="radar-orbit__glow" />
      <div className="radar-orbit__grid" />
      <div className="radar-orbit__ring-soft" />
      <div className="radar-orbit__sweep" />

      <svg className="radar-orbit__gauge" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="72" className="radar-orbit__gauge-track" />
        <circle
          key={focus}
          cx="100"
          cy="100"
          r="72"
          className={`radar-orbit__gauge-value is-${direction}`}
          style={{ strokeDasharray: circumference, strokeDashoffset: ringOffset(ready ? card!.percent! : null) }}
        />
      </svg>

      <div className="radar-orbit__center" key={focus} aria-live="polite">
        <span className="radar-orbit__label">{title}</span>
        <strong className={`radar-orbit__value is-${direction}`}>
          {ready ? formatPercent(card!.percent!) : locked ? <><Lock size={22} /> قفل</> : '—'}
        </strong>
        <small>
          {ready
            ? card!.status === 'stale'
              ? 'داده کمی قدیمی · سیگنال معامله نیست'
              : 'محاسبه زنده · سیگنال معامله نیست'
            : locked
              ? 'با اشتراک پریمیوم باز می‌شود'
              : card?.reason ?? 'در انتظار داده'}
        </small>
      </div>

      <div className={`radar-orbit__wheel ${paused ? 'is-paused' : ''}`} style={{ ['--count' as string]: nodes.length }}>
        {nodes.map((item, index) => {
          const itemCard = item.bubbleKey ? bubbles.find(bubble => bubble.key === item.bubbleKey) : undefined;
          const itemReady = !item.locked && itemCard && (itemCard.status === 'ok' || itemCard.status === 'stale') && itemCard.percent != null;
          const itemLocked = item.locked || itemCard?.status === 'blocked';
          return (
            <button
              key={item.key}
              type="button"
              className={`radar-orbit__node ${item.className} ${focus === item.key ? 'is-active' : ''} ${itemLocked ? 'is-locked' : ''}`}
              style={{ ['--i' as string]: index }}
              aria-pressed={focus === item.key}
              onClick={() => { setFocus(item.key); setPaused(true); }}
            >
              <span className="radar-orbit__node-face">
                <b>{item.token}</b>
                <small>{item.short}</small>
                {itemLocked ? <em><Lock size={10} /> قفل</em> : <em>{itemReady ? formatPercent(itemCard!.percent!) : '—'}</em>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="radar-orbit__caption"><span className="status-dot" /> چرخش خودکار · نمادهای قفل = پریمیوم</div>
    </div>
  );
}
